// fill 빈칸 명세 중 화면이 쓰는 것만. page.tsx 의 publicConfig.blanks 와
// TrainClient·FillBody·SelfCheck 가 같은 모양을 본다.
export interface FillBlank {
  key: string
  label: string
  maxChars: number | null
  minSentences: number | null
  maxSentences: number | null
  optional: boolean
}
