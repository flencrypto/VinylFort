import { ebayGraphQL, type EbayGraphQLClientOptions } from "./graphqlClient.js";

export type { EbayGraphQLClientOptions } from "./graphqlClient.js";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export type ExternalProductAspect = {
  name: string;
  values: string[];
};

export type ExternalProductIdentifierInput = {
  type: "EAN" | "UPC" | "ISBN" | "GTIN" | string;
  value: string;
};

/** Input shape expected by eBay's startListingPreviewsCreation mutation. */
export type ExternalProductDetailsInput = {
  /** Strongly recommended; used to correlate preview output back to your record. */
  sku: string;
  title?: string;
  /** Publicly accessible HTTPS image URLs. */
  images?: string[];
  /**
   * Required when `aspects` are provided.
   * Use the leaf category name, e.g. "Vinyl Records".
   */
  categoryName?: string;
  aspects?: ExternalProductAspect[];
  externalProductIdentifierInput?: ExternalProductIdentifierInput;
};

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export type ListingPreviewAspect = {
  name: string;
  values: string[];
  confidence?: "HIGH" | "MEDIUM" | "LOW";
};

export type ListingPreviewCategory = {
  id: string;
  name?: string;
};

export type ListingPreviewProduct = {
  epid?: string;
};

export type ListingPreview = {
  sku: string;
  mappingReferenceId: string;
  category?: ListingPreviewCategory;
  aspects?: ListingPreviewAspect[];
  title?: string;
  description?: string;
  images?: string[];
  product?: ListingPreviewProduct;
};

export type ListingPreviewsCreationTask = {
  taskId: string;
  completionStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  listingPreviews?: ListingPreview[];
};

// ---------------------------------------------------------------------------
// Internal record type (VinylFort)
// ---------------------------------------------------------------------------

/** Internal record shape produced by VinylFort's OCR / listing flow. */
export type VinylFortRecord = {
  sku?: string;
  artist?: string;
  title?: string;
  year?: string | number;
  label?: string;
  catalogueNumber?: string;
  format?: string;
  country?: string;
  genre?: string;
  condition?: string;
  /** Barcode / EAN scanned from record sleeve. */
  barcode?: string;
  /** Publicly accessible URLs of uploaded photos. */
  photoUrls?: string[];
};

// ---------------------------------------------------------------------------
// Conversion helper
// ---------------------------------------------------------------------------

/**
 * Convert a VinylFort internal record into an `ExternalProductDetailsInput`
 * suitable for the eBay Inventory Mapping API.
 */
export function toExternalProduct(
  record: VinylFortRecord,
  sku: string,
): ExternalProductDetailsInput {
  const aspects: ExternalProductAspect[] = [];

  if (record.artist) aspects.push({ name: "Artist", values: [record.artist] });
  if (record.label) aspects.push({ name: "Record Label", values: [record.label] });
  if (record.year) aspects.push({ name: "Release Year", values: [String(record.year)] });
  if (record.catalogueNumber) aspects.push({ name: "Catalog Number", values: [record.catalogueNumber] });
  if (record.format) aspects.push({ name: "Format", values: [record.format] });
  if (record.country) aspects.push({ name: "Country/Region of Manufacture", values: [record.country] });
  if (record.genre) aspects.push({ name: "Genre", values: [record.genre] });
  if (record.condition) aspects.push({ name: "Condition", values: [record.condition] });

  const titleParts = [record.artist, record.title, record.year, record.format]
    .filter(Boolean)
    .join(" ");

  const product: ExternalProductDetailsInput = {
    sku,
    title: titleParts || undefined,
    categoryName: aspects.length > 0 ? "Vinyl Records" : undefined,
    aspects: aspects.length > 0 ? aspects : undefined,
    images: record.photoUrls?.length ? record.photoUrls : undefined,
  };

  if (record.barcode) {
    product.externalProductIdentifierInput = {
      type: "EAN",
      value: record.barcode,
    };
  }

  return product;
}

// ---------------------------------------------------------------------------
// GraphQL mutations / queries
// ---------------------------------------------------------------------------

const START_LISTING_PREVIEWS_MUTATION = /* graphql */ `
  mutation StartListingPreviewsCreation($input: StartListingPreviewsCreationInput!) {
    startListingPreviewsCreation(input: $input) {
      taskId
      completionStatus
    }
  }
`;

const GET_TASK_QUERY = /* graphql */ `
  query ListingPreviewsCreationTaskById($taskId: String!) {
    listingPreviewsCreationTaskById(taskId: $taskId) {
      taskId
      completionStatus
      listingPreviews {
        sku
        mappingReferenceId
        title
        description
        images
        category { id name }
        aspects { name values confidence }
        product { epid }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

type StartPreviewsResult = {
  startListingPreviewsCreation: { taskId: string; completionStatus: string };
};

/**
 * Start a listing previews creation task for up to 10 external products.
 * Returns the `taskId` to poll with `pollListingPreviewsTask`.
 */
export async function startListingPreviews(
  externalProducts: ExternalProductDetailsInput[],
  options: EbayGraphQLClientOptions,
): Promise<string> {
  if (externalProducts.length === 0 || externalProducts.length > 10) {
    throw new RangeError("externalProducts must contain between 1 and 10 items");
  }

  const result = await ebayGraphQL<StartPreviewsResult>(
    START_LISTING_PREVIEWS_MUTATION,
    { input: { externalProducts } },
    options,
  );

  return result.startListingPreviewsCreation.taskId;
}

type GetTaskResult = {
  listingPreviewsCreationTaskById: ListingPreviewsCreationTask;
};

/**
 * Fetch the current state of a listing previews creation task.
 */
export async function getListingPreviewsTask(
  taskId: string,
  options: EbayGraphQLClientOptions,
): Promise<ListingPreviewsCreationTask> {
  const result = await ebayGraphQL<GetTaskResult>(
    GET_TASK_QUERY,
    { taskId },
    options,
  );

  return result.listingPreviewsCreationTaskById;
}
