import { ActivityIndicator, Alert, Animated, Easing, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CustomButton from '@/components/CustomButton';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { fetchLocations } from '@/lib/adminContent';
import { supabase } from '@/lib/supabase';

type Row = Record<string, unknown>;

type MessageItem = {
	body: string;
	conversationId: string | null;
	createdAt: string | null;
	id: string;
	isRead: boolean;
	senderLabel: string;
	senderRole: 'admin' | 'client' | 'unknown';
};

type MessageQueryResult = {
	conversationClosedById: Record<string, boolean>;
	messages: MessageItem[];
	sourceTable: string | null;
};

type BookingSection = {
	bookingCustomerName: string | null;
	bookingPreferredDatesSummary: string | null;
	bookingServicesSummary: string | null;
	id: string;
	lastMessageAt: string | null;
	messages: MessageItem[];
	preview: string;
	title: string;
	type: 'booking' | 'general';
};

type BookingSelection = {
	price: number;
	role: string;
	service: string;
	serviceCategory: string;
};

const MESSAGE_TABLES = ['messages'];
const MESSAGE_BODY_KEYS = ['content'];
const BOOKING_REQUEST_PREFIX = '[BOOKING_REQUEST]';
const SAVED_LOCATION_KEY = 'topone.currentLocationId';

function generateUuid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
		const randomValue = Math.floor(Math.random() * 16);
		const nextValue = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8;

		return nextValue.toString(16);
	});
}

function getString(row: Row, keys: string[]): string | null {
	for (const key of keys) {
		const value = row[key];

		if (typeof value === 'string' && value.trim().length > 0) {
			return value.trim();
		}
	}

	return null;
}

function getBoolean(row: Row, keys: string[], defaultValue = false): boolean {
	for (const key of keys) {
		const value = row[key];

		if (typeof value === 'boolean') {
			return value;
		}

		if (typeof value === 'string') {
			const normalizedValue = value.trim().toLowerCase();

			if (normalizedValue === 'true') {
				return true;
			}

			if (normalizedValue === 'false') {
				return false;
			}
		}
	}

	return defaultValue;
}

function getIdentifier(row: Row): string {
	const rawIdentifier = row.id ?? row.uuid ?? row.message_id ?? row.messageId;

	if (typeof rawIdentifier === 'string' && rawIdentifier.trim().length > 0) {
		return rawIdentifier;
	}

	if (typeof rawIdentifier === 'number') {
		return rawIdentifier.toString();
	}

	return Math.random().toString(36).slice(2);
}

function getSenderRole(row: Row, userId: string): 'admin' | 'client' | 'unknown' {
	if (getBoolean(row, ['sender_is_admin', 'senderIsAdmin'], false)) {
		return 'admin';
	}

	const senderId = getString(row, ['user_id', 'userId']);

	if (senderId && senderId === userId) {
		return 'client';
	}

	return 'unknown';
}

function getMessageLocationId(row: Row, body: string, conversationId: string | null): string | null {
	const directLocationId = getString(row, ['location_id', 'locationId', 'salon_id', 'salonId', 'branch_id', 'branchId']);

	if (directLocationId) {
		return directLocationId;
	}

	const bodyLocationMatch = body.match(/^\[LOC:([^\]]+)\]\s*/);

	return bodyLocationMatch?.[1] ?? null;
}

function mapMessages(rows: Row[], userId: string, activeLocationId: string | null): MessageItem[] {
	return rows
		.map((row) => {
			const body = getString(row, MESSAGE_BODY_KEYS);

			if (!body) {
				return null;
			}

			const senderRole = getSenderRole(row, userId);
			const conversationId = getString(row, ['conversation_id', 'conversationId']) ?? getConversationId(body);
			const messageLocationId = getMessageLocationId(row, body, conversationId);

			if (activeLocationId && messageLocationId !== activeLocationId) {
				return null;
			}

			return {
				body: stripLocationPrefix(body),
				conversationId,
				createdAt: getString(row, ['created_at', 'createdAt', 'sent_at', 'sentAt', 'timestamp']),
				id: getIdentifier(row),
				isRead: getBoolean(row, ['is_read', 'isRead'], false),
				senderLabel:
					(senderRole === 'client' ? 'You' : senderRole === 'admin' ? 'Admin' : 'Team'),
				senderRole,
			};
		})
		.filter((item): item is MessageItem => item !== null)
		.sort((leftMessage, rightMessage) => {
			const leftTime = leftMessage.createdAt ? new Date(leftMessage.createdAt).getTime() : 0;
			const rightTime = rightMessage.createdAt ? new Date(rightMessage.createdAt).getTime() : 0;

			return leftTime - rightTime;
		});
}

async function fetchMessagesForUser(userId: string, activeLocationId: string | null): Promise<MessageQueryResult> {
	let reachableTable: string | null = null;

	for (const table of MESSAGE_TABLES) {
		const { data, error: probeError } = await supabase
			.from(table)
			.select('id, user_id, sender_is_admin, content, is_read, created_at, conversation_id, location_id')
			.eq('user_id', userId)
			.order('created_at', { ascending: true });

		if (probeError) {
			continue;
		}

		reachableTable = table;
		const matchedRows = (data as Row[]) ?? [];
		const mappedMessages = mapMessages(matchedRows, userId, activeLocationId);
		const conversationIds = [...new Set(mappedMessages
			.map((message) => message.conversationId)
			.filter((conversationId): conversationId is string => Boolean(conversationId)))];
		const conversationClosedById: Record<string, boolean> = {};

		if (conversationIds.length > 0) {
			const { data: conversationMetadata, error: metadataError } = await supabase
				.from('conversation_metadata')
				.select('conversation_id, closed_at')
				.in('conversation_id', conversationIds)
				.not('closed_at', 'is', null);

			if (!metadataError) {
				for (const row of ((conversationMetadata as Row[]) ?? [])) {
					const conversationId = getString(row, ['conversation_id', 'conversationId']);
					const closedAt = getString(row, ['closed_at', 'closedAt']);

					if (conversationId && closedAt) {
						conversationClosedById[conversationId] = true;
					}
				}
			}
		}

		return {
			conversationClosedById,
			messages: mappedMessages,
			sourceTable: table,
		};
	}

	return {
		conversationClosedById: {},
		messages: [],
		sourceTable: reachableTable,
	};
}

async function resolveValidLocationId(candidateLocationId: string | null): Promise<string | null> {
	const { data, error } = await supabase
		.from('locations')
		.select('id, is_default, sort_order')
		.order('sort_order', { ascending: true });

	if (error) {
		// If locations cannot be read due policy/network issues, keep the saved value.
		return candidateLocationId;
	}

	const rows = (data as Row[]) ?? [];

	if (rows.length === 0) {
		return candidateLocationId;
	}

	const locationIds = rows
		.map((row) => getString(row, ['id']))
		.filter((id): id is string => Boolean(id));

	if (locationIds.length === 0) {
		return candidateLocationId;
	}

	if (candidateLocationId && locationIds.includes(candidateLocationId)) {
		return candidateLocationId;
	}

	const defaultLocationId = rows
		.find((row) => getBoolean(row, ['is_default', 'isDefault'], false))
		?.id;

	if (typeof defaultLocationId === 'string' && defaultLocationId.trim().length > 0) {
		return defaultLocationId;
	}

	return candidateLocationId ?? locationIds[0] ?? null;
}

async function fetchLocationNameById(locationId: string | null): Promise<string | null> {
	if (!locationId) {
		return null;
	}

	const { data, error } = await supabase
		.from('locations')
		.select('name')
		.eq('id', locationId)
		.single();

	if (error) {
		return null;
	}

	return getString((data as Row) ?? {}, ['name']);
}

async function sendMessageToAdmins(userId: string, messageText: string, conversationId?: string | null, locationId?: string | null) {
	const payload: {
		content: string;
		conversation_id?: string;
		is_read: boolean;
		location_id?: string;
		sender_is_admin: boolean;
		user_id: string;
	} = {
		content: messageText,
		is_read: false,
		sender_is_admin: false,
		user_id: userId,
	};

	if (conversationId) {
		payload.conversation_id = conversationId;
	}

	if (locationId) {
		payload.location_id = locationId;
	}

	let lastErrorMessage: string | null = null;

	for (const table of MESSAGE_TABLES) {
		const { error: probeError } = await supabase.from(table).select('id').limit(1);

		if (probeError) {
			lastErrorMessage = probeError.message;
			continue;
		}

		const { error } = await supabase.from(table).insert(payload);

		if (!error) {
			return table;
		}

		if (error.message.includes('messages_location_id_fkey')) {
			throw new Error('Your selected salon is no longer valid. Please choose your location again and retry.');
		}

		lastErrorMessage = error.message;
	}

	throw new Error(lastErrorMessage ?? 'Unable to send message to the messages table.');
}

function formatTimestamp(value: string | null) {
	if (!value) {
		return 'Just now';
	}

	const parsedDate = new Date(value);

	if (Number.isNaN(parsedDate.getTime())) {
		return 'Just now';
	}

	return parsedDate.toLocaleString([], {
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		month: 'short',
	});
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeCustomerName(value: string) {
	return value.trim().length > 0 ? value.trim() : 'Customer';
}

function formatPreferredDateLabel(value: string) {
	const parsedDate = new Date(`${value}T00:00:00`);

	if (Number.isNaN(parsedDate.getTime())) {
		return value;
	}

	const weekday = parsedDate.toLocaleDateString([], { weekday: 'short' });
	const month = parsedDate.toLocaleDateString([], { month: 'short' });
	const day = parsedDate.toLocaleDateString([], { day: 'numeric' });

	return `${weekday} ${month} ${day}`;
}

function buildBookingRequestMessage(customerName: string, services: BookingSelection[], preferredDates: string[]) {
	const normalizedName = normalizeCustomerName(customerName);
	const summary = services.map((service) => `${service.service} (${service.role})`).join('\n');
	const preferredDatesSummary = preferredDates.map(formatPreferredDateLabel).join('\n');

	return `${BOOKING_REQUEST_PREFIX} ${normalizedName} would like to book for\n${summary}\n\nPreferred dates:\n${preferredDatesSummary}\n\n(Please ${normalizedName} wait for an admin to respond)`;
}

function parseBookingRequest(messageBody: string) {
	const cleanBody = stripBookingPrefix(messageBody);
	const lines = cleanBody.split('\n').map((line) => line.trim());
	const firstLine = lines[0] ?? '';
	const bookingMatch = firstLine.match(/^(.*?)\s+would like to book for\s*(.*)$/i);

	if (!bookingMatch) {
		return {
			customerName: null,
			preferredDatesSummary: null,
			servicesSummary: null,
		};
	}

	const preferredDatesIndex = lines.findIndex((line) => line.toLowerCase() === 'preferred dates:');
	const serviceLines = preferredDatesIndex >= 0
		? lines.slice(1, preferredDatesIndex)
		: lines.slice(1);
	const preferredDateLines = preferredDatesIndex >= 0
		? lines.slice(preferredDatesIndex + 1)
		: [];
	const cleanedServiceLines = serviceLines.filter((line) => line.length > 0 && !line.startsWith('(Please'));
	const cleanedPreferredDateLines = preferredDateLines.filter((line) => line.length > 0 && !line.startsWith('(Please'));
	const inlineServicesSummary = bookingMatch[2]?.trim() || null;
	const parsedServicesSummary = cleanedServiceLines.length > 0 ? cleanedServiceLines.join('\n') : inlineServicesSummary;

	return {
		customerName: bookingMatch[1]?.trim() || null,
		preferredDatesSummary: cleanedPreferredDateLines.length > 0 ? cleanedPreferredDateLines.join('\n') : null,
		servicesSummary: parsedServicesSummary,
	};
}

function splitBookingLines(value: string | null) {
	if (!value) {
		return [] as string[];
	}

	return value
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

function getConversationId(messageBody: string) {
	const normalizedBody = stripLocationPrefix(messageBody);
	const match = normalizedBody.match(/^\[CONVO:([^\]]+)\]\s*/);

	return match?.[1] ?? null;
}

function getBookingSectionTitle(messageBody: string) {
	const cleanBody = messageBody.replace(/^\[CONVO:[^\]]+\]\s*/, '').replace(`${BOOKING_REQUEST_PREFIX} `, '').trim();
	const firstLine = cleanBody.split('\n')[0] ?? 'Booking Request';
	const titleMatch = firstLine.match(/would like to book for (.+)$/i);

	return titleMatch?.[1]?.trim() || firstLine;
}

function stripBookingPrefix(messageBody: string) {
	const cleanBody = stripLocationPrefix(messageBody).replace(/^\[CONVO:[^\]]+\]\s*/, '').trim();

	if (!cleanBody.startsWith(BOOKING_REQUEST_PREFIX)) {
		return cleanBody;
	}

	return cleanBody.replace(new RegExp(`^${escapeRegExp(BOOKING_REQUEST_PREFIX)}\\s*`), '').trim();
}

function stripLocationPrefix(messageBody: string) {
	return messageBody.replace(/^\[LOC:[^\]]+\]\s*/, '').trim();
}

function getBookingFollowUpNote(messageBody: string) {
	const segments = stripBookingPrefix(messageBody)
		.split('\n\n')
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0);

	return segments.find((segment) => segment.startsWith('(Please')) ?? '';
}

function groupMessagesIntoSections(messages: MessageItem[]): BookingSection[] {
	const sectionsById = new Map<string, BookingSection>();

	for (const message of messages) {
		const conversationId = message.conversationId ?? getConversationId(message.body) ?? 'general-messages';
		const cleanBody = stripBookingPrefix(message.body);
		const isBookingThread = message.body.includes(BOOKING_REQUEST_PREFIX);
		const existingSection = sectionsById.get(conversationId);

		if (!existingSection) {
			const bookingDetails = isBookingThread ? parseBookingRequest(message.body) : { customerName: null, preferredDatesSummary: null, servicesSummary: null };

			sectionsById.set(conversationId, {
				bookingCustomerName: bookingDetails.customerName,
				bookingPreferredDatesSummary: bookingDetails.preferredDatesSummary,
				bookingServicesSummary: bookingDetails.servicesSummary,
				id: conversationId,
				lastMessageAt: message.createdAt,
				messages: [message],
				preview: bookingDetails.servicesSummary ?? cleanBody,
				title: bookingDetails.customerName ?? (isBookingThread ? getBookingSectionTitle(message.body) : 'General Enquiries'),
				type: isBookingThread ? 'booking' : 'general',
			});
			continue;
		}

		existingSection.messages.push(message);
		existingSection.lastMessageAt = message.createdAt;

		if (isBookingThread) {
			const bookingDetails = parseBookingRequest(message.body);
			existingSection.bookingCustomerName = bookingDetails.customerName;
			existingSection.bookingPreferredDatesSummary = bookingDetails.preferredDatesSummary;
			existingSection.bookingServicesSummary = bookingDetails.servicesSummary;
			existingSection.preview = bookingDetails.servicesSummary ?? cleanBody;
			existingSection.title = bookingDetails.customerName ?? existingSection.title;
		} else {
			existingSection.preview = cleanBody;
		}
	}

	return [...sectionsById.values()].sort((leftSection, rightSection) => {
		const leftTime = leftSection.lastMessageAt ? new Date(leftSection.lastMessageAt).getTime() : 0;
		const rightTime = rightSection.lastMessageAt ? new Date(rightSection.lastMessageAt).getTime() : 0;

		return rightTime - leftTime;
	});
}

const Book = () => {
	const [session, setSession] = useState<Session | null>(null);
	const [sessionLoading, setSessionLoading] = useState(true);
	const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
	const [activeLocationName, setActiveLocationName] = useState<string | null>(null);
	const [hasResolvedSavedLocation, setHasResolvedSavedLocation] = useState(false);
	const [draftMessage, setDraftMessage] = useState('');
	const [sending, setSending] = useState(false);
	const [customerName, setCustomerName] = useState('Customer');
	const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
	const processedBookingKeyRef = useRef<string | null>(null);
	const flatListRef = useRef<FlatList>(null);
	const searchParams = useLocalSearchParams<{ bookingDates?: string | string[]; bookingKey?: string | string[]; bookingServices?: string | string[] }>();

	useFocusEffect(
		useCallback(() => {
			let active = true;

			setHasResolvedSavedLocation(false);

			const loadSavedLocation = async () => {
				try {
					const savedLocationId = await AsyncStorage.getItem(SAVED_LOCATION_KEY);
					const nextLocationId = await resolveValidLocationId(savedLocationId);

					if (!active) {
						return;
					}

					setActiveLocationId(nextLocationId);

					if (savedLocationId && !nextLocationId) {
						await AsyncStorage.removeItem(SAVED_LOCATION_KEY);
					} else if (nextLocationId && nextLocationId !== savedLocationId) {
						await AsyncStorage.setItem(SAVED_LOCATION_KEY, nextLocationId);
					}
				} catch {
					if (active) {
						setActiveLocationId(null);
					}
				} finally {
					if (active) {
						setHasResolvedSavedLocation(true);
					}
				}
			};

			void loadSavedLocation();

			return () => {
				active = false;
			};
		}, [])
	);

	useEffect(() => {
		setSelectedConversationId(null);
	}, [activeLocationId]);

	useEffect(() => {
		let active = true;

		const loadLocationName = async () => {
			const locationName = await fetchLocationNameById(activeLocationId);

			if (!active) {
				return;
			}

			setActiveLocationName(locationName);
		};

		void loadLocationName();

		return () => {
			active = false;
		};
	}, [activeLocationId]);

	useEffect(() => {
		let active = true;

		supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
			if (!active) {
				return;
			}

			setSession(nextSession);
			setSessionLoading(false);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, nextSession) => {
			if (!active) {
				return;
			}

			setSession(nextSession);
			setSessionLoading(false);
		});

		return () => {
			active = false;
			subscription.unsubscribe();
		};
	}, []);

	useEffect(() => {
		if (!session?.user?.id) {
			setCustomerName('Customer');
			return;
		}

		let active = true;

		const loadCustomerName = async () => {
			const { data } = await supabase
				.from('profiles')
				.select('first_name, last_name, username')
				.eq('id', session.user.id)
				.single();

			if (!active) {
				return;
			}

			const firstName = typeof data?.first_name === 'string' ? data.first_name.trim() : '';
			const lastName = typeof data?.last_name === 'string' ? data.last_name.trim() : '';
			const username = typeof data?.username === 'string' ? data.username.trim() : '';
			const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

			setCustomerName(normalizeCustomerName(fullName || firstName || username || session.user.email?.split('@')[0] || 'Customer'));
		};

		void loadCustomerName();

		return () => {
			active = false;
		};
	}, [session]);

	const userId = session?.user?.id ?? null;
	const enabled = Boolean(userId) && hasResolvedSavedLocation;

	const fetchMessages = useCallback(() => {
		if (!userId || !hasResolvedSavedLocation) {
			return Promise.resolve({
				conversationClosedById: {},
				messages: [],
				sourceTable: null,
			});
		}

		return fetchMessagesForUser(userId, activeLocationId);
	}, [activeLocationId, hasResolvedSavedLocation, userId]);

	const {
		data: messageResult,
		error,
		loading,
		refreshing,
		refetch,
	} = useRealtimeQuery({
		fetcher: fetchMessages,
		initialData: {
			conversationClosedById: {},
			messages: [],
			sourceTable: null,
		},
		tables: MESSAGE_TABLES,
		enabled,
	});

	const bookingSections = useMemo(() => groupMessagesIntoSections(messageResult.messages), [messageResult.messages]);
	const selectedConversation = useMemo(
		() => bookingSections.find((section) => section.id === selectedConversationId) ?? null,
		[bookingSections, selectedConversationId]
	);
	const isSelectedConversationClosed = selectedConversation
		? Boolean(messageResult.conversationClosedById[selectedConversation.id])
		: false;
	const bookingKey = Array.isArray(searchParams.bookingKey) ? searchParams.bookingKey[0] : searchParams.bookingKey;
	const encodedBookingDates = Array.isArray(searchParams.bookingDates) ? searchParams.bookingDates[0] : searchParams.bookingDates;
	const encodedBookingServices = Array.isArray(searchParams.bookingServices) ? searchParams.bookingServices[0] : searchParams.bookingServices;

	const helperText = useMemo(() => {
		if (!activeLocationId) {
			return 'Select a location to view and send messages for that salon.';
		}

		if (messageResult.sourceTable) {
			return 'Tell the salon what service you want, which day works for you, and any stylist preference.';
		}

		return 'If sending still fails, the messages table likely uses different required columns or has row-level security blocking inserts.';
	}, [activeLocationId, messageResult.sourceTable]);

	const resolveAndPersistLocation = useCallback(async (preferredLocationId?: string | null) => {
		const savedLocationId = await AsyncStorage.getItem(SAVED_LOCATION_KEY);
		const nextPreferredLocationId = preferredLocationId ?? activeLocationId ?? savedLocationId;
		const resolvedLocationId = await resolveValidLocationId(nextPreferredLocationId);

		if (resolvedLocationId !== activeLocationId) {
			setActiveLocationId(resolvedLocationId);
		}

		if (resolvedLocationId && savedLocationId !== resolvedLocationId) {
			await AsyncStorage.setItem(SAVED_LOCATION_KEY, resolvedLocationId);
		}

		if (!resolvedLocationId && savedLocationId) {
			await AsyncStorage.removeItem(SAVED_LOCATION_KEY);
		}

		return resolvedLocationId;
	}, [activeLocationId]);

	const forceResetToAvailableLocation = useCallback(async () => {
		const locationResult = await fetchLocations();
		const locations = locationResult.data;

		if (locationResult.sourceTable === null || locations.length === 0) {
			return null;
		}

		const fallbackLocation = locations.find((location) => location.isDefault) ?? locations[0] ?? null;
		const fallbackLocationId = fallbackLocation?.id ?? null;

		if (!fallbackLocationId) {
			return null;
		}

		setActiveLocationId(fallbackLocationId);
		setActiveLocationName(fallbackLocation?.name ?? null);
		await AsyncStorage.setItem(SAVED_LOCATION_KEY, fallbackLocationId);
		await refetch();

		return fallbackLocationId;
	}, [refetch]);

	const markConversationAsRead = useCallback(
		async (conversationId: string) => {
			if (!userId) return;
			await supabase
				.from('messages')
				.update({ is_read: true })
				.eq('user_id', userId)
				.eq('conversation_id', conversationId)
				.eq('sender_is_admin', true)
				.eq('is_read', false);
			await refetch();
		},
		[refetch, userId]
	);

	const handleSendMessage = useCallback(async () => {
		if (!userId) {
			router.push('/sign-in');
			return;
		}

		const trimmedMessage = draftMessage.trim();

		if (!trimmedMessage) {
			return;
		}

		const targetLocationId = await resolveAndPersistLocation();

		if (!targetLocationId) {
			Alert.alert('Location required', 'Please choose a valid salon location before sending a message.');
			return;
		}

		if (selectedConversationId && messageResult.conversationClosedById[selectedConversationId]) {
			Alert.alert('Conversation closed', 'This conversation is closed. Start a new conversation for a new request.');
			return;
		}

		const targetConversationId = selectedConversationId ?? generateUuid();

		try {
			setSending(true);
			await sendMessageToAdmins(userId, trimmedMessage, targetConversationId, targetLocationId);
			setDraftMessage('');
			setSelectedConversationId(targetConversationId);
			await refetch();
		} catch (sendError) {
			const message = sendError instanceof Error ? sendError.message : 'Unable to send message.';

			if (message.includes('selected salon is no longer valid')) {
				Alert.alert(
					'Location updated',
					'This salon was removed. Press OK and we will switch to an available salon and resend your message.',
					[
						{
							text: 'OK',
							onPress: () => {
								void (async () => {
									const recoveredLocationId = await forceResetToAvailableLocation();

									if (!recoveredLocationId) {
										Alert.alert('Location required', 'Please choose a salon location and try again.');
										return;
									}

									try {
										setSending(true);
										await sendMessageToAdmins(userId, trimmedMessage, targetConversationId, recoveredLocationId);
										setDraftMessage('');
										setSelectedConversationId(targetConversationId);
										await refetch();
									} catch (retryError) {
										const retryMessage = retryError instanceof Error ? retryError.message : 'Unable to resend message.';
										Alert.alert('Message not sent', retryMessage);
									} finally {
										setSending(false);
									}
								})();
							},
						},
					],
					{ cancelable: true }
				);
				return;
			}

			Alert.alert('Message not sent', message);
		} finally {
			setSending(false);
		}
	}, [draftMessage, forceResetToAvailableLocation, messageResult.conversationClosedById, refetch, resolveAndPersistLocation, selectedConversationId, userId]);

	useEffect(() => {
		if (!userId || !bookingKey || !encodedBookingServices || !encodedBookingDates || !hasResolvedSavedLocation) {
			return;
		}

		if (processedBookingKeyRef.current === bookingKey) {
			return;
		}

		let parsedServices: BookingSelection[] = [];
		let parsedDates: string[] = [];

		try {
			const rawServices = JSON.parse(encodedBookingServices) as BookingSelection[];
			parsedServices = Array.isArray(rawServices) ? rawServices : [];
			const rawDates = JSON.parse(encodedBookingDates) as string[];
			parsedDates = Array.isArray(rawDates) ? rawDates.filter((value) => typeof value === 'string' && value.trim().length > 0) : [];
		} catch {
			Alert.alert('Booking not created', 'The selected services could not be prepared for the booking message.');
			processedBookingKeyRef.current = bookingKey;
			void router.replace('/book');
			return;
		}

		if (parsedServices.length === 0 || parsedDates.length === 0) {
			processedBookingKeyRef.current = bookingKey;
			void router.replace('/book');
			return;
		}

		processedBookingKeyRef.current = bookingKey;
		const bookingMessage = buildBookingRequestMessage(customerName, parsedServices, parsedDates);
		void (async () => {
			try {
				const targetLocationId = await resolveAndPersistLocation();

				if (!targetLocationId) {
					processedBookingKeyRef.current = null;
					Alert.alert('Location required', 'Please choose a salon location before creating a booking request.');
					return;
				}

				if (messageResult.conversationClosedById[bookingKey]) {
					Alert.alert('Conversation closed', 'This booking conversation is closed. Please create a new booking request.');
					void router.replace('/book');
					return;
				}

				setSending(true);
				await sendMessageToAdmins(userId, bookingMessage, bookingKey, targetLocationId);
				await refetch();
				setSelectedConversationId(bookingKey);
			} catch (sendError) {
				processedBookingKeyRef.current = null;
				const message = sendError instanceof Error ? sendError.message : 'Unable to send booking request.';

				if (message.includes('selected salon is no longer valid')) {
					Alert.alert(
						'Location updated',
						'This salon was removed. Press OK and we will switch to an available salon and resend your booking request.',
						[
							{
								text: 'OK',
								onPress: () => {
									void (async () => {
										const recoveredLocationId = await forceResetToAvailableLocation();

										if (!recoveredLocationId) {
											Alert.alert('Location required', 'Please choose a salon location and try again.');
											return;
										}

										try {
											setSending(true);
											await sendMessageToAdmins(userId, bookingMessage, bookingKey, recoveredLocationId);
											await refetch();
											setSelectedConversationId(bookingKey);
										} catch (retryError) {
											const retryMessage = retryError instanceof Error ? retryError.message : 'Unable to resend booking request.';
											Alert.alert('Booking not created', retryMessage);
										} finally {
											setSending(false);
											void router.replace('/book');
										}
									})();
								},
							},
						],
						{ cancelable: true }
					);
					return;
				}

				Alert.alert('Booking not created', message);
				return;
			} finally {
				setSending(false);
				void router.replace('/book');
			}
		})();
	}, [bookingKey, customerName, encodedBookingDates, encodedBookingServices, forceResetToAvailableLocation, hasResolvedSavedLocation, messageResult.conversationClosedById, refetch, resolveAndPersistLocation, userId]);

	useEffect(() => {
		if (!selectedConversationId) {
			return;
		}

		if (!bookingSections.some((section) => section.id === selectedConversationId)) {
			setSelectedConversationId(null);
		}
	}, [bookingSections, selectedConversationId]);

	const newestHighlight = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(newestHighlight, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
				Animated.timing(newestHighlight, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
			])
		);

		loop.start();

		return () => loop.stop();
	}, [newestHighlight]);

	const newestBorderColor = newestHighlight.interpolate({
		inputRange: [0, 1],
		outputRange: ['rgba(142, 209, 252, 0.25)', 'rgba(142, 209, 252, 1)'],
	});

	if (sessionLoading) {
		return (
			<SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-primary" style={{ backgroundColor: '#161622' }}>
				<ActivityIndicator size="large" color="#8ED1FC" />
			</SafeAreaView>
		);
	}

	if (!session) {
		return (
			<SafeAreaView edges={['top']} className="flex-1 bg-primary" style={{ backgroundColor: '#161622' }}>
				<View className="flex-1 px-4 pb-8 pt-3">
					<View className="rounded-3xl border border-black-200 bg-black-100 px-5 py-6">
						<Text className="font-psemibold text-2xl text-white">Messages</Text>
						<Text className="mt-3 font-pregular text-sm text-gray-100">
							Sign in to message the salon, ask for a booking, and receive replies from the admin team.
						</Text>
						<CustomButton
							title="Sign In To Message"
							handlePress={() => router.push('/sign-in')}
							containerStyles="mt-6"
							textStyles=""
							isLoading={false}
						/>
					</View>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView edges={['top']} className="flex-1 bg-primary" style={{ backgroundColor: '#161622' }}>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 0}
			>
				<View className="border-b border-black-200 px-4 pb-3 pt-2">
					{selectedConversation ? (
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
							<Pressable
								onPress={() => setSelectedConversationId(null)}
								hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
								style={{ width: 38, height: 38, borderRadius: 999, backgroundColor: '#1E1E2D', borderWidth: 1, borderColor: '#232533', alignItems: 'center', justifyContent: 'center' }}
							>
								<Text style={{ color: '#8ED1FC', fontSize: 22, lineHeight: 26, marginLeft: -2 }}>‹</Text>
							</Pressable>
							<View style={{ flex: 1, alignItems: 'center' }}>
								<Text className="font-psemibold text-base text-white">{activeLocationName ?? 'Top One'}</Text>
								{isSelectedConversationClosed ? (
									<Text className="font-pregular text-[11px] text-red-200">Conversation closed</Text>
								) : (
									<Text className="font-pregular text-[11px] text-gray-100">Salon</Text>
								)}
							</View>
							<View style={{ width: 38 }} />
						</View>
					) : (
						<View>
							<Text className="font-pregular text-sm text-gray-100">Booking Support</Text>
							<Text className="mt-1 font-psemibold text-2xl text-white">Messages</Text>
							<Text className="mt-2 font-pregular text-sm text-gray-100">{helperText}</Text>
						</View>
					)}
					{error ? <Text className="mt-2 font-pregular text-sm text-red-300">{error}</Text> : null}
				</View>

				{selectedConversation ? (
					<FlatList
						ref={flatListRef}
						data={selectedConversation.messages}
						keyExtractor={(item) => item.id}
						contentContainerStyle={{ flexGrow: 1, padding: 16 }}
						refreshing={refreshing}
						onRefresh={refetch}
						onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
						onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
						renderItem={({ item }) => {
							const isClientMessage = item.senderRole === 'client';
							const bookingDetails = item.body.includes(BOOKING_REQUEST_PREFIX) ? parseBookingRequest(item.body) : null;
							const serviceLines = splitBookingLines(bookingDetails?.servicesSummary ?? null);
							const preferredDateLines = splitBookingLines(bookingDetails?.preferredDatesSummary ?? null);
							const bookingFollowUpNote = item.body.includes(BOOKING_REQUEST_PREFIX) ? getBookingFollowUpNote(item.body) : '';

							return (
								<View className={`mb-3 ${isClientMessage ? 'items-end' : 'items-start'}`}>
									<View
										className={`max-w-[92%] rounded-2xl px-4 py-3 ${isClientMessage ? 'bg-secondary' : 'bg-primary'}`}
										style={{ borderWidth: 1, borderColor: isClientMessage ? '#8ED1FC' : '#232533' }}
									>
										<Text className={`font-psemibold text-xs ${isClientMessage ? 'text-primary' : 'text-secondary'}`}>
											{item.senderLabel}
										</Text>
										{bookingDetails?.customerName && bookingDetails?.servicesSummary ? (
											<>
												<Text className={`mt-2 font-pbold text-base ${isClientMessage ? 'text-primary' : 'text-white'}`}>
													{bookingDetails.customerName}
												</Text>
												<View className="mt-2 gap-1">
													{serviceLines.map((line, index) => (
														<Text key={`${item.id}-service-${index}`} className={`font-psemibold text-sm ${isClientMessage ? 'text-primary' : 'text-secondary'}`}>
															{line}
														</Text>
													))}
												</View>
												{bookingDetails.preferredDatesSummary ? (
													<View className="mt-3">
														<Text className={`font-psemibold text-sm ${isClientMessage ? 'text-primary' : 'text-white'}`}>
															Preferred dates:
														</Text>
														<View className="mt-1 gap-1">
															{preferredDateLines.map((line, index) => (
																<Text key={`${item.id}-date-${index}`} className={`font-psemibold text-sm ${isClientMessage ? 'text-primary' : 'text-secondary'}`}>
																	{line}
																</Text>
															))}
														</View>
													</View>
												) : null}
												{bookingFollowUpNote ? (
													<Text className={`mt-3 font-pregular text-sm ${isClientMessage ? 'text-primary' : 'text-gray-100'}`}>
														{bookingFollowUpNote}
													</Text>
												) : null}
											</>
										) : (
											<Text className={`mt-1 font-pregular text-sm ${isClientMessage ? 'text-primary' : 'text-white'}`}>
												{stripBookingPrefix(item.body)}
											</Text>
										)}
										
										<Text className={`mt-2 font-pregular text-[11px] ${isClientMessage ? 'text-primary' : 'text-gray-100'}`}>
											{formatTimestamp(item.createdAt)}
										</Text>
									</View>
								</View>
							);
						}}
					/>
				) : (
					<FlatList
						data={bookingSections}
						keyExtractor={(item) => item.id}
						contentContainerStyle={{ flexGrow: 1, padding: 16 }}
						refreshing={refreshing}
						onRefresh={refetch}
						renderItem={({ item: section, index }) => (
							<Pressable onPress={() => { setSelectedConversationId(section.id); void markConversationAsRead(section.id); }} className="mb-4 rounded-3xl border border-black-200 bg-black-100 px-4 py-4">
								{index === 0 && bookingSections.length > 1 ? (
									<Animated.View
										pointerEvents="none"
										style={{ position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderRadius: 24, borderWidth: 2, borderColor: newestBorderColor }}
									/>
								) : null}
								<View className="flex-row items-start justify-between gap-4">
									<View className="flex-1">
										<Text className="font-pbold text-lg text-white">{section.title}</Text>
										<Text className="mt-1 font-pregular text-xs text-gray-100">
											{section.type === 'booking' ? 'Booking request conversation' : 'General conversation'}
										</Text>
										{messageResult.conversationClosedById[section.id] ? (
											<Text className="mt-2 font-psemibold text-xs uppercase tracking-wider text-red-200">Closed conversation</Text>
										) : null}
										{section.bookingServicesSummary ? (
											<>
												<Text className="mt-3 font-psemibold text-sm text-secondary" numberOfLines={2}>
													{section.bookingServicesSummary}
												</Text>
												{section.bookingPreferredDatesSummary ? (
													<View className="mt-3 rounded-2xl border border-secondary/30 bg-secondary/10 px-3 py-3">
														<Text className="font-psemibold text-[11px] uppercase tracking-wider text-secondary">
															Preferred dates
														</Text>
														<Text className="mt-1 font-psemibold text-sm leading-5 text-white" numberOfLines={3}>
															{section.bookingPreferredDatesSummary}
														</Text>
													</View>
												) : null}
											</>
										) : (
											<Text className="mt-3 font-pregular text-sm text-gray-100" numberOfLines={2}>
												{section.preview}
											</Text>
										)}
									</View>
									<View className="items-end">
										<Text className="font-psemibold text-[11px] text-secondary">{formatTimestamp(section.lastMessageAt)}</Text>
										{(() => {
											const unreadCount = section.messages.filter((m) => m.senderRole === 'admin' && !m.isRead).length;
											return unreadCount > 0 ? (
												<View style={{ marginTop: 8, minWidth: 22, height: 22, borderRadius: 999, backgroundColor: '#8ED1FC', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
													<Text style={{ fontFamily: 'Poppins-Bold', fontSize: 11, color: '#161622' }}>{unreadCount}</Text>
												</View>
											) : (
												<Text className="mt-3 font-pregular text-[11px] text-gray-100">{section.messages.length} msgs</Text>
											);
										})()}
									</View>
								</View>
							</Pressable>
						)}
						ListEmptyComponent={() => (
							<View className="flex-1 items-center justify-center rounded-3xl border border-black-200 bg-black-100 px-5 py-8">
								{loading ? (
									<ActivityIndicator size="small" color="#8ED1FC" />
								) : (
									<>
										<Text className="font-psemibold text-lg text-white">No conversations yet</Text>
										<Text className="mt-2 text-center font-pregular text-sm text-gray-100">
											Select services in the Services tab, then book them to create a new conversation here.
										</Text>
									</>
								)}
							</View>
						)}
					/>
				)}

		                <View className="border-t border-black-200 px-4 pb-4 pt-3">
                                        <View className="flex-row items-center rounded-full border border-black-200 bg-black-100 px-4" style={{ minHeight: 48 }}>
                                                {isSelectedConversationClosed ? (
                                                        <Text className="flex-1 font-pregular text-sm text-gray-100">Conversation closed</Text>
                                                ) : (
                                                        <TextInput
                                                                value={draftMessage}
                                                                onChangeText={setDraftMessage}
                                                                placeholder="Type a message..."
                                                                placeholderTextColor="#7b7b8b"
                                                                multiline
                                                                editable={!isSelectedConversationClosed}
                                                                style={{ flex: 1, color: '#ffffff', fontFamily: 'Poppins-Regular', fontSize: 14, paddingVertical: 12, maxHeight: 100, textAlignVertical: 'center' }}
                                                        />
                                                )}
                                                <Pressable
                                                        onPress={handleSendMessage}
                                                        disabled={isSelectedConversationClosed || sending || draftMessage.trim().length === 0}
                                                        style={{ marginLeft: 8, width: 36, height: 36, borderRadius: 999, backgroundColor: isSelectedConversationClosed || sending || draftMessage.trim().length === 0 ? '#232533' : '#8ED1FC', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                        <Text style={{ color: isSelectedConversationClosed || sending || draftMessage.trim().length === 0 ? '#7b7b8b' : '#161622', fontSize: 18, lineHeight: 22, fontWeight: 'bold' }}>{'>'}</Text>
                                                </Pressable>
                                        </View>
                                </View>
                        </KeyboardAvoidingView>
		</SafeAreaView>
	);
};

export default Book;
