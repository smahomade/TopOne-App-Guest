import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Session } from '@supabase/supabase-js';

import CustomButton from '@/components/CustomButton';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
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
	messages: MessageItem[];
	sourceTable: string | null;
};

type BookingSection = {
	bookingCustomerName: string | null;
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
const CONVERSATION_PREFIX = '[CONVO:';

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

function mapMessages(rows: Row[], userId: string): MessageItem[] {
	return rows
		.map((row) => {
			const body = getString(row, MESSAGE_BODY_KEYS);

			if (!body) {
				return null;
			}

			const senderRole = getSenderRole(row, userId);

			return {
				body,
				conversationId: getString(row, ['conversation_id', 'conversationId']) ?? getConversationId(body),
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

async function fetchMessagesForUser(userId: string): Promise<MessageQueryResult> {
	let reachableTable: string | null = null;

	for (const table of MESSAGE_TABLES) {
		const { data, error: probeError } = await supabase
			.from(table)
			.select('id, user_id, sender_is_admin, content, is_read, created_at, conversation_id')
			.eq('user_id', userId)
			.order('created_at', { ascending: true });

		if (probeError) {
			continue;
		}

		reachableTable = table;
		const matchedRows = (data as Row[]) ?? [];

		return {
			messages: mapMessages(matchedRows, userId),
			sourceTable: table,
		};
	}

	return {
		messages: [],
		sourceTable: reachableTable,
	};
}

async function sendMessageToAdmins(userId: string, messageText: string, conversationId?: string | null) {
	const payload: {
		content: string;
		conversation_id?: string;
		is_read: boolean;
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

function buildBookingRequestMessage(customerName: string, services: BookingSelection[]) {
	const normalizedName = normalizeCustomerName(customerName);
	const summary = services.map((service) => `${service.service} (${service.role})`).join(', ');

	return `${BOOKING_REQUEST_PREFIX} ${normalizedName} would like to book for ${summary}\n\n(Please ${normalizedName} wait for an admin to respond)`;
}

function parseBookingRequest(messageBody: string) {
	const cleanBody = stripBookingPrefix(messageBody);
	const firstLine = cleanBody.split('\n')[0]?.trim() ?? '';
	const bookingMatch = firstLine.match(/^(.*?)\s+would like to book for\s+(.+)$/i);

	if (!bookingMatch) {
		return {
			customerName: null,
			servicesSummary: null,
		};
	}

	return {
		customerName: bookingMatch[1]?.trim() || null,
		servicesSummary: bookingMatch[2]?.trim() || null,
	};
}

function getConversationId(messageBody: string) {
	const match = messageBody.match(/^\[CONVO:([^\]]+)\]\s*/);

	return match?.[1] ?? null;
}

function getBookingSectionTitle(messageBody: string) {
	const cleanBody = messageBody.replace(/^\[CONVO:[^\]]+\]\s*/, '').replace(`${BOOKING_REQUEST_PREFIX} `, '').trim();
	const firstLine = cleanBody.split('\n')[0] ?? 'Booking Request';
	const titleMatch = firstLine.match(/would like to book for (.+)$/i);

	return titleMatch?.[1]?.trim() || firstLine;
}

function stripBookingPrefix(messageBody: string) {
	const cleanBody = messageBody.replace(/^\[CONVO:[^\]]+\]\s*/, '').trim();

	if (!cleanBody.startsWith(BOOKING_REQUEST_PREFIX)) {
		return cleanBody;
	}

	return cleanBody.replace(new RegExp(`^${escapeRegExp(BOOKING_REQUEST_PREFIX)}\\s*`), '').trim();
}

function groupMessagesIntoSections(messages: MessageItem[]): BookingSection[] {
	const sectionsById = new Map<string, BookingSection>();

	for (const message of messages) {
		const conversationId = message.conversationId ?? getConversationId(message.body) ?? 'general-messages';
		const cleanBody = stripBookingPrefix(message.body);
		const isBookingThread = message.body.includes(BOOKING_REQUEST_PREFIX);
		const existingSection = sectionsById.get(conversationId);

		if (!existingSection) {
			const bookingDetails = isBookingThread ? parseBookingRequest(message.body) : { customerName: null, servicesSummary: null };

			sectionsById.set(conversationId, {
				bookingCustomerName: bookingDetails.customerName,
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
	const [draftMessage, setDraftMessage] = useState('');
	const [sending, setSending] = useState(false);
	const [customerName, setCustomerName] = useState('Customer');
	const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
	const processedBookingKeyRef = useRef<string | null>(null);
	const searchParams = useLocalSearchParams<{ bookingKey?: string | string[]; bookingServices?: string | string[] }>();

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
	const enabled = Boolean(userId);

	const fetchMessages = useCallback(() => {
		if (!userId) {
			return Promise.resolve({
				messages: [],
				sourceTable: null,
			});
		}

		return fetchMessagesForUser(userId);
	}, [userId]);

	const {
		data: messageResult,
		error,
		loading,
		refreshing,
		refetch,
	} = useRealtimeQuery({
		fetcher: fetchMessages,
		initialData: {
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
	const bookingKey = Array.isArray(searchParams.bookingKey) ? searchParams.bookingKey[0] : searchParams.bookingKey;
	const encodedBookingServices = Array.isArray(searchParams.bookingServices) ? searchParams.bookingServices[0] : searchParams.bookingServices;

	const helperText = useMemo(() => {
		if (messageResult.sourceTable) {
			return 'Tell the salon what service you want, which day works for you, and any stylist preference.';
		}

		return 'If sending still fails, the messages table likely uses different required columns or has row-level security blocking inserts.';
	}, [messageResult.sourceTable]);

	const handleSendMessage = useCallback(async () => {
		if (!userId) {
			router.push('/sign-in');
			return;
		}

		const trimmedMessage = draftMessage.trim();

		if (!trimmedMessage) {
			return;
		}

		try {
			setSending(true);
			await sendMessageToAdmins(userId, trimmedMessage, selectedConversationId);
			setDraftMessage('');
			await refetch();
		} catch (sendError) {
			const message = sendError instanceof Error ? sendError.message : 'Unable to send message.';
			Alert.alert('Message not sent', message);
		} finally {
			setSending(false);
		}
	}, [draftMessage, refetch, selectedConversationId, userId]);

	useEffect(() => {
		if (!userId || !bookingKey || !encodedBookingServices) {
			return;
		}

		if (processedBookingKeyRef.current === bookingKey) {
			return;
		}

		let parsedServices: BookingSelection[] = [];

		try {
			const rawServices = JSON.parse(encodedBookingServices) as BookingSelection[];
			parsedServices = Array.isArray(rawServices) ? rawServices : [];
		} catch {
			Alert.alert('Booking not created', 'The selected services could not be prepared for the booking message.');
			processedBookingKeyRef.current = bookingKey;
			void router.replace('/book');
			return;
		}

		if (parsedServices.length === 0) {
			processedBookingKeyRef.current = bookingKey;
			void router.replace('/book');
			return;
		}

		processedBookingKeyRef.current = bookingKey;
		const bookingMessage = buildBookingRequestMessage(customerName, parsedServices);

		void (async () => {
			try {
				setSending(true);
				await sendMessageToAdmins(userId, bookingMessage, bookingKey);
				await refetch();
				setSelectedConversationId(bookingKey);
			} catch (sendError) {
				processedBookingKeyRef.current = null;
				const message = sendError instanceof Error ? sendError.message : 'Unable to send booking request.';
				Alert.alert('Booking not created', message);
				return;
			} finally {
				setSending(false);
				void router.replace('/book');
			}
		})();
	}, [bookingKey, customerName, encodedBookingServices, refetch, userId]);

	useEffect(() => {
		if (!selectedConversationId) {
			return;
		}

		if (!bookingSections.some((section) => section.id === selectedConversationId)) {
			setSelectedConversationId(null);
		}
	}, [bookingSections, selectedConversationId]);

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
				<View className="border-b border-black-200 px-4 pb-4 pt-2">
					<Text className="font-pregular text-sm text-gray-100">Booking Support</Text>
					<Text className="mt-1 font-psemibold text-2xl text-white">{selectedConversation ? selectedConversation.title : 'Messages'}</Text>
					{selectedConversation ? (
						<Pressable onPress={() => setSelectedConversationId(null)} className="mt-3 self-start rounded-full border border-black-200 px-3 py-2">
							<Text className="font-psemibold text-xs text-gray-100">Back to all conversations</Text>
						</Pressable>
					) : null}
					<Text className="mt-2 font-pregular text-sm text-gray-100">{helperText}</Text>
					{error ? <Text className="mt-2 font-pregular text-sm text-red-300">{error}</Text> : null}
				</View>

				{selectedConversation ? (
					<FlatList
						data={selectedConversation.messages}
						keyExtractor={(item) => item.id}
						contentContainerStyle={{ flexGrow: 1, padding: 16 }}
						refreshing={refreshing}
						onRefresh={refetch}
						renderItem={({ item }) => {
							const isClientMessage = item.senderRole === 'client';
							const bookingDetails = item.body.includes(BOOKING_REQUEST_PREFIX) ? parseBookingRequest(item.body) : null;

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
												<Text className={`mt-1 font-psemibold text-sm ${isClientMessage ? 'text-primary' : 'text-secondary'}`}>
													{bookingDetails.servicesSummary}
												</Text>
												<Text className={`mt-2 font-pregular text-sm ${isClientMessage ? 'text-primary' : 'text-gray-100'}`}>
													{stripBookingPrefix(item.body).split('\n\n')[1] ?? ''}
												</Text>
											</>
										) : (
											<Text className={`mt-1 font-pregular text-sm ${isClientMessage ? 'text-primary' : 'text-white'}`}>
												{stripBookingPrefix(item.body)}
											</Text>
										)}
										{item.senderRole === 'admin' && !item.isRead ? (
											<Text className="mt-2 font-pregular text-[11px] text-secondary">New reply</Text>
										) : null}
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
						renderItem={({ item: section }) => (
							<Pressable onPress={() => setSelectedConversationId(section.id)} className="mb-4 rounded-3xl border border-black-200 bg-black-100 px-4 py-4">
								<View className="flex-row items-start justify-between gap-4">
									<View className="flex-1">
										<Text className="font-pbold text-lg text-white">{section.title}</Text>
										<Text className="mt-1 font-pregular text-xs text-gray-100">
											{section.type === 'booking' ? 'Booking request conversation' : 'General conversation'}
										</Text>
										{section.bookingServicesSummary ? (
											<Text className="mt-3 font-psemibold text-sm text-secondary" numberOfLines={2}>
												{section.bookingServicesSummary}
											</Text>
										) : (
											<Text className="mt-3 font-pregular text-sm text-gray-100" numberOfLines={2}>
												{section.preview}
											</Text>
										)}
									</View>
									<View className="items-end">
										<Text className="font-pregular text-[11px] text-gray-100">{formatTimestamp(section.lastMessageAt)}</Text>
										<Text className="mt-3 font-psemibold text-xs text-secondary">{section.messages.length} messages</Text>
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

				<View className="border-t border-black-200 px-4 pb-6 pt-4">
					<View className="rounded-3xl border border-black-200 bg-black-100 px-4 py-4">
						<TextInput
							value={draftMessage}
							onChangeText={setDraftMessage}
							placeholder="Ask for a booking, service, date, or stylist"
							placeholderTextColor="#7b7b8b"
							multiline
							style={{ color: '#ffffff', fontFamily: 'Poppins-Regular', minHeight: 92, textAlignVertical: 'top' }}
						/>
						<View className="mt-4 flex-row items-center justify-between">
							<Text className="mr-4 flex-1 font-pregular text-xs text-gray-100">
								Example: “Can I book balayage next Friday after 3pm?”
							</Text>
							<Pressable
								onPress={handleSendMessage}
								disabled={sending || draftMessage.trim().length === 0}
								className={`rounded-2xl px-5 py-3 ${sending || draftMessage.trim().length === 0 ? 'bg-black-200' : 'bg-secondary'}`}
							>
								<Text className={`font-psemibold ${sending || draftMessage.trim().length === 0 ? 'text-gray-100' : 'text-primary'}`}>
									{sending ? 'Sending...' : 'Send'}
								</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

export default Book;
