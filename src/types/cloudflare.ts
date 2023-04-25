// From @cloudflare/types/dist/api

type PaginationInfo = {
  next_page?: boolean
  page: number
  per_page: number
  count: number
  total_count: number
  total_pages: number
  cursors?: {
    before?: string
    after?: string
  }
}

type APIResponseBodyError = {
  code?: number
  message: string
}

export type APIResponseBody<ExpectedData = {}, ExpectedResultInfo = PaginationInfo> = {
  result: ExpectedData
  success: boolean
  errors: APIResponseBodyError[]
  messages: any[]
  result_info?: ExpectedResultInfo
}

export type DNSRecord = {
  content: string | undefined
  created_on: string | undefined
  id: string | undefined
  data: any | undefined
  locked: boolean | undefined
  meta: unknown | undefined
  modified_on: string | undefined
  name: string
  priority: number | undefined
  proxiable: boolean | undefined
  proxied: boolean | undefined
  ttl: number | undefined
  type:
    | "A"
    | "AAAA"
    | "CNAME"
    | "CAA"
    | "CERT"
    | "DNSKEY"
    | "DS"
    | "HTTPS"
    | "LOC"
    | "MX"
    | "NAPTR"
    | "NS"
    | "PTR"
    | "SRV"
    | "SPF"
    | "TXT"
    | "SMIMEA"
    | "SSHFP"
    | "SVCB"
    | "TLSA"
    | "URI"
  zone_id: string | undefined
  zone_name: string | undefined
  comment: string | undefined
  tags: string[] | undefined
}
