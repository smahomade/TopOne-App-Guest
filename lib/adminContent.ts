import { supabase } from '@/lib/supabase';

type Row = Record<string, unknown>;

export type LiveContentResult<T> = {
  data: T;
  sourceTable: string | null;
};

export type HomeBanner = {
  ctaRoute: string | null;
  description: string;
  id: string;
  imageUrl: string | null;
  title: string;
};

export type GalleryImage = {
  id: string;
  imageUrl: string;
  subtitle: string | null;
  title: string | null;
  year: string;
};

export type OpeningTime = {
  closeTime: string | null;
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
};

export type LocationCard = {
  address: string;
  addressLine1: string;
  addressLine2: string | null;
  country: string | null;
  email: string | null;
  id: string;
  imageUrl: string | null;
  isDefault: boolean;
  name: string;
  openingHours: string | null;
  openingTimes: OpeningTime[];
  phone: string | null;
  postcode: string | null;
};

export type ServiceRole = {
  price: number;
  role: string;
};

export type GroupedService = {
  duration: number | null;
  roles: ServiceRole[];
  service: string;
  serviceCategory: string;
};

export type ServiceCategoryMap = Record<string, GroupedService[]>;

export const HOME_CONTENT_TABLES = ['home_banners', 'banners', 'home_cards'];
export const GALLERY_CONTENT_TABLES = ['gallery_images', 'gallery', 'collections'];
export const LOCATION_CONTENT_TABLES = ['locations', 'opening_times', 'salons', 'branches'];
export const SERVICES_CONTENT_TABLES = ['services'];

type OpeningTimeRow = {
  close_time?: string | null;
  day_of_week?: number | string | null;
  is_closed?: boolean | string | null;
  open_time?: string | null;
};

function getString(row: Row, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getNumber(row: Row, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
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

function getYear(row: Row): string {
  const explicitYear = getNumber(row, ['year', 'collection_year', 'collectionYear']);

  if (explicitYear !== null) {
    return explicitYear.toString();
  }

  const dateValue = getString(row, ['date', 'published_at', 'publishedAt', 'created_at', 'createdAt']);

  if (dateValue) {
    const parsedDate = new Date(dateValue);

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.getFullYear().toString();
    }
  }

  return 'Unknown';
}

function getIdentifier(row: Row): string {
  const rawIdentifier = row.id ?? row.uuid ?? row.slug ?? row.code;

  if (typeof rawIdentifier === 'string' && rawIdentifier.trim().length > 0) {
    return rawIdentifier;
  }

  if (typeof rawIdentifier === 'number') {
    return rawIdentifier.toString();
  }

  return Math.random().toString(36).slice(2);
}

function sortRows(rows: Row[]): Row[] {
  return [...rows].sort((leftRow, rightRow) => {
    const leftSortOrder = getNumber(leftRow, ['sort_order', 'display_order', 'position', 'order']) ?? Number.MAX_SAFE_INTEGER;
    const rightSortOrder = getNumber(rightRow, ['sort_order', 'display_order', 'position', 'order']) ?? Number.MAX_SAFE_INTEGER;

    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder;
    }

    const leftCreatedAt = getString(leftRow, ['created_at', 'createdAt']) ?? '';
    const rightCreatedAt = getString(rightRow, ['created_at', 'createdAt']) ?? '';

    return leftCreatedAt.localeCompare(rightCreatedAt);
  });
}

function formatTimeValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return value;
  }

  const hourValue = Number(match[1]);
  const minuteValue = match[2];

  if (!Number.isFinite(hourValue)) {
    return value;
  }

  const suffix = hourValue >= 12 ? 'PM' : 'AM';
  const normalizedHour = hourValue % 12 === 0 ? 12 : hourValue % 12;

  return `${normalizedHour}:${minuteValue} ${suffix}`;
}

function formatOpeningHours(openingTimes: OpeningTimeRow[] | null | undefined) {
  if (!Array.isArray(openingTimes) || openingTimes.length === 0) {
    return null;
  }

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const lines = [...openingTimes]
    .sort((leftRow, rightRow) => {
      const leftDay = typeof leftRow.day_of_week === 'number' ? leftRow.day_of_week : Number(leftRow.day_of_week ?? 99);
      const rightDay = typeof rightRow.day_of_week === 'number' ? rightRow.day_of_week : Number(rightRow.day_of_week ?? 99);

      return leftDay - rightDay;
    })
    .map((row) => {
      const dayIndex = typeof row.day_of_week === 'number' ? row.day_of_week : Number(row.day_of_week ?? -1);
      const dayLabel = dayLabels[dayIndex] ?? 'Day';
      const isClosed = typeof row.is_closed === 'boolean'
        ? row.is_closed
        : typeof row.is_closed === 'string'
          ? row.is_closed.trim().toLowerCase() === 'true'
          : false;

      if (isClosed) {
        return `${dayLabel}: Closed`;
      }

      const openTime = formatTimeValue(row.open_time);
      const closeTime = formatTimeValue(row.close_time);

      if (!openTime || !closeTime) {
        return null;
      }

      return `${dayLabel}: ${openTime} - ${closeTime}`;
    })
    .filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.join('\n') : null;
}

function mapOpeningTimes(openingTimes: OpeningTimeRow[] | null | undefined): OpeningTime[] {
  if (!Array.isArray(openingTimes)) {
    return [];
  }

  return [...openingTimes]
    .map((row) => {
      const dayOfWeek = typeof row.day_of_week === 'number' ? row.day_of_week : Number(row.day_of_week ?? -1);

      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return null;
      }

      const isClosed = typeof row.is_closed === 'boolean'
        ? row.is_closed
        : typeof row.is_closed === 'string'
          ? row.is_closed.trim().toLowerCase() === 'true'
          : false;

      return {
        closeTime: row.close_time ?? null,
        dayOfWeek,
        isClosed,
        openTime: row.open_time ?? null,
      };
    })
    .filter((item): item is OpeningTime => item !== null)
    .sort((leftRow, rightRow) => leftRow.dayOfWeek - rightRow.dayOfWeek);
}

async function fetchFirstAvailableList<T>(
  tables: string[],
  mapper: (row: Row) => T | null
): Promise<LiveContentResult<T[]>> {
  let firstReachableTable: string | null = null;

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');

    if (error) {
      continue;
    }

    if (!firstReachableTable) {
      firstReachableTable = table;
    }

    const mappedRows = sortRows((data as Row[]) ?? [])
      .map(mapper)
      .filter((item): item is T => item !== null);

    if (mappedRows.length > 0) {
      return {
        data: mappedRows,
        sourceTable: table,
      };
    }
  }

  return {
    data: [],
    sourceTable: firstReachableTable,
  };
}

export async function fetchHomeBanners(): Promise<LiveContentResult<HomeBanner[]>> {
  return fetchFirstAvailableList(HOME_CONTENT_TABLES, (row) => {
    if (getBoolean(row, ['is_active', 'isActive'], true) === false) {
      return null;
    }

    const imageUrl = getString(row, ['image_url', 'imageUrl', 'thumbnail_url', 'thumbnailUrl', 'banner_url', 'bannerUrl', 'cover_image_url']);
    const title = getString(row, ['title', 'headline', 'name']) ?? 'Latest Update';
    const description = getString(row, ['description', 'subtitle', 'body']) ?? '';

    if (!imageUrl && description.length === 0 && title.length === 0) {
      return null;
    }

    return {
      ctaRoute: getString(row, ['cta_route', 'ctaRoute', 'link', 'route']),
      description,
      id: getIdentifier(row),
      imageUrl,
      title,
    };
  });
}

export async function fetchGalleryImages(): Promise<LiveContentResult<GalleryImage[]>> {
  return fetchFirstAvailableList(GALLERY_CONTENT_TABLES, (row) => {
    if (getBoolean(row, ['is_active', 'isActive'], true) === false) {
      return null;
    }

    const imageUrl = getString(row, ['image_url', 'imageUrl', 'thumbnail_url', 'thumbnailUrl', 'photo_url', 'photoUrl']);

    if (!imageUrl) {
      return null;
    }

    return {
      id: getIdentifier(row),
      imageUrl,
      subtitle: getString(row, ['subtitle', 'sub_title', 'subTitle', 'description']),
      title: getString(row, ['title', 'name', 'caption']),
      year: getYear(row),
    };
  });
}

export async function fetchLocations(): Promise<LiveContentResult<LocationCard[]>> {
  const { data: locationData, error: locationError } = await supabase
    .from('locations')
    .select(`
      id,
      name,
      address_line_1,
      address_line_2,
      postcode,
      country,
      phone,
      email,
      image_url,
      sort_order,
      created_at,
      opening_hours,
      opening_times(day_of_week, open_time, close_time, is_closed)
    `)
    .order('sort_order', { ascending: true });

  if (!locationError) {
    const mappedLocations = sortRows((locationData as Row[]) ?? [])
      .map((row) => {
        const name = getString(row, ['name', 'title', 'branch_name', 'branchName']) ?? 'Location';
        const addressLine1 = getString(row, ['address_line_1', 'addressLine1', 'address', 'full_address', 'fullAddress', 'location']) ?? '';
        const addressLine2 = getString(row, ['address_line_2', 'addressLine2']);
        const postcode = getString(row, ['postcode', 'postal_code', 'postalCode', 'zip_code', 'zipCode']);
        const country = getString(row, ['country']);
        const phone = getString(row, ['phone', 'phone_number', 'phoneNumber']);
        const email = getString(row, ['email']);
        const address = [addressLine1, postcode].filter(Boolean).join(', ');
        const openingTimes = mapOpeningTimes((row.opening_times as OpeningTimeRow[] | null | undefined) ?? null);
        const openingHours = formatOpeningHours((row.opening_times as OpeningTimeRow[] | null | undefined) ?? null)
          ?? getString(row, ['opening_hours', 'openingHours', 'hours']);

        if (name.length === 0 && address.length === 0) {
          return null;
        }

        return {
          address,
          addressLine1,
          addressLine2,
          country,
          email,
          id: getIdentifier(row),
          imageUrl: getString(row, ['image_url', 'imageUrl', 'thumbnail_url', 'thumbnailUrl', 'banner_url', 'bannerUrl']),
          isDefault: getBoolean(row, ['is_default', 'isDefault'], false),
          name,
          openingHours,
          openingTimes,
          phone,
          postcode,
        };
      })
      .filter((item): item is LocationCard => item !== null);

    return {
      data: mappedLocations,
      sourceTable: 'locations',
    };
  }

  return fetchFirstAvailableList(LOCATION_CONTENT_TABLES, (row) => {
    if (getBoolean(row, ['is_active', 'isActive'], true) === false) {
      return null;
    }

    const name = getString(row, ['name', 'title', 'branch_name', 'branchName']) ?? 'Location';
    const addressLine1 = getString(row, ['address_line_1', 'addressLine1', 'address', 'full_address', 'fullAddress', 'location']) ?? '';
    const addressLine2 = getString(row, ['address_line_2', 'addressLine2']);
    const postcode = getString(row, ['postcode', 'postal_code', 'postalCode', 'zip_code', 'zipCode']);
    const country = getString(row, ['country']);
    const phone = getString(row, ['phone', 'phone_number', 'phoneNumber']);
    const email = getString(row, ['email']);
    const openingHours = getString(row, ['opening_hours', 'openingHours', 'hours']);
    const address = [addressLine1, postcode].filter(Boolean).join(', ');

    if (name.length === 0 && address.length === 0) {
      return null;
    }

    return {
      address,
      addressLine1,
      addressLine2,
      country,
      email,
      id: getIdentifier(row),
      imageUrl: getString(row, ['image_url', 'imageUrl', 'thumbnail_url', 'thumbnailUrl', 'banner_url', 'bannerUrl']),
      isDefault: getBoolean(row, ['is_default', 'isDefault'], false),
      name,
      openingHours,
      openingTimes: [],
      phone,
      postcode,
    };
  });
}

export async function fetchServices(locationId?: string | null): Promise<LiveContentResult<ServiceCategoryMap>> {
  let query = supabase.from('services').select('*');

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query;

  if (error) {
    return {
      data: {},
      sourceTable: null,
    };
  }

  const groupedServices = sortRows((data as Row[]) ?? []).reduce<ServiceCategoryMap>((categories, row) => {
    if (getBoolean(row, ['is_active', 'isActive'], true) === false) {
      return categories;
    }

    const mainCategory = getString(row, ['main_category', 'mainCategory']) ?? 'Services';
    const serviceCategory = getString(row, ['service_category', 'serviceCategory']) ?? 'General';
    const serviceName = getString(row, ['service', 'name', 'title']) ?? 'Service';
    const duration = getNumber(row, ['duration', 'duration_minutes', 'durationMinutes', 'service_duration', 'serviceDuration']);
    const role = getString(row, ['role']) ?? 'Stylist';
    const price = getNumber(row, ['price']) ?? 0;

    if (!categories[mainCategory]) {
      categories[mainCategory] = [];
    }

    const existingGroup = categories[mainCategory].find((group) => group.service === serviceName);

    if (existingGroup) {
      if (existingGroup.duration === null && duration !== null) {
        existingGroup.duration = duration;
      }

      existingGroup.roles.push({
        price,
        role,
      });

      return categories;
    }

    categories[mainCategory].push({
      duration,
      roles: [{ price, role }],
      service: serviceName,
      serviceCategory,
    });

    return categories;
  }, {});

  return {
    data: groupedServices,
    sourceTable: 'services',
  };
}