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
  title: string | null;
  year: string;
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
  phone: string | null;
  postcode: string | null;
};

export type ServiceRole = {
  price: number;
  role: string;
};

export type GroupedService = {
  roles: ServiceRole[];
  service: string;
  serviceCategory: string;
};

export type ServiceCategoryMap = Record<string, GroupedService[]>;

export const HOME_CONTENT_TABLES = ['home_banners', 'banners', 'home_cards'];
export const GALLERY_CONTENT_TABLES = ['gallery_images', 'gallery', 'collections'];
export const LOCATION_CONTENT_TABLES = ['locations', 'salons', 'branches'];
export const SERVICES_CONTENT_TABLES = ['services'];

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
      title: getString(row, ['title', 'name', 'caption']),
      year: getYear(row),
    };
  });
}

export async function fetchLocations(): Promise<LiveContentResult<LocationCard[]>> {
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
      phone,
      postcode,
    };
  });
}

export async function fetchServices(): Promise<LiveContentResult<ServiceCategoryMap>> {
  const { data, error } = await supabase.from('services').select('*');

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
    const role = getString(row, ['role']) ?? 'Stylist';
    const price = getNumber(row, ['price']) ?? 0;

    if (!categories[mainCategory]) {
      categories[mainCategory] = [];
    }

    const existingGroup = categories[mainCategory].find(
      (group) => group.service === serviceName && group.serviceCategory === serviceCategory
    );

    if (existingGroup) {
      existingGroup.roles.push({
        price,
        role,
      });

      return categories;
    }

    categories[mainCategory].push({
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