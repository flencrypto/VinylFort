export type RecordProps = {
  id: string
  artist: string
  title: string
  label?: string
  cat?: string
  year?: string
  country?: string
  format?: string
  condition?: { media?: string; sleeve?: string }
  variantConfidence?: "High" | "Medium" | "Low"
  valuationConfidence?: "High" | "Medium" | "Low"
}
