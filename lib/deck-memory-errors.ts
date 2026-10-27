/** Only safe categories cross the API boundary; raw provider errors may contain input. */
export function deckReaderFailure(error: unknown) {
  let item = error as { name?: string; finishReason?: string; statusCode?: number; code?: string; cause?: unknown } | null;
  for (let depth = 0; item && depth < 5; depth++) {
    if (item.name === 'AI_NoObjectGeneratedError') return item.finishReason === 'length' ? 'response_truncated' : 'response_invalid';
    if (item.name === 'AI_TypeValidationError' || item.name === 'AI_JSONParseError') return 'response_invalid';
    if (item.name === 'TimeoutError' || item.name === 'AbortError' || item.code === 'ETIMEDOUT' || item.code === 'UND_ERR_CONNECT_TIMEOUT') return 'reader_timeout';
    if (item.statusCode === 429) return 'reader_limited';
    if (item.statusCode === 401 || item.statusCode === 403) return 'reader_credentials';
    if (item.statusCode && item.statusCode >= 500) return 'reader_upstream';
    if (item.statusCode === 400 || item.statusCode === 404 || item.statusCode === 422) return 'reader_configuration';
    if (item.code === 'ECONNRESET' || item.code === 'ENOTFOUND' || item.code === 'ECONNREFUSED') return 'reader_network';
    item = item.cause as typeof item;
  }
  return 'reader_unavailable';
}

/** Retain only bounded schema paths/codes, never values, provider text or requests. */
export function deckReaderDiagnostics(error: unknown): string[] {
  const notes: string[] = [];
  const fields = new Set(['cards','warnings','title','name','count','region','box_2d','x','y','width','height','uncertainName','uncertainCount']);
  const codes = new Set(['too_big','too_small','invalid_type','invalid_value','invalid_format','unrecognized_keys','custom']);
  let item = error as { finishReason?: string; statusCode?: number; cause?: unknown; issues?: { path?: unknown[]; code?: string }[] } | null;
  for (let depth=0; item && depth<5; depth++) {
    if (['stop','length','content-filter','error','unknown'].includes(item.finishReason || '')) notes.push(`Reader finish: ${item.finishReason}.`);
    if (typeof item.statusCode==='number' && Number.isInteger(item.statusCode) && item.statusCode >= 400 && item.statusCode <= 599) notes.push(`Provider HTTP status: ${item.statusCode}.`);
    for (const issue of Array.isArray(item.issues) ? item.issues.slice(0,6) : []) {
      const path=issue.path;
      if (path?.length && path.length<=6 && path.every(p=>typeof p==='number' ? Number.isInteger(p)&&p>=0&&p<150 : typeof p==='string'&&fields.has(p)) && codes.has(issue.code || '')) {
        notes.push(`Invalid field: ${path.join('.')} (${issue.code}).`);
      }
    }
    item=item.cause as typeof item;
  }
  return [...new Set(notes)].slice(0,8);
}
export function deckReaderFailureMessage(category: string | null) {
  switch (category) {
    case 'response_truncated': return 'The reading stopped before the card list was complete. Retry this reader or try a smaller crop.';
    case 'response_invalid': return 'The reader returned a card list in an invalid format. Retry this reader or use the other result.';
    case 'reader_timeout': return 'The reader took too long. Retry this reader or use the other result.';
    case 'reader_limited': return 'The provider is limiting requests. Try again later or use the other reader.';
    case 'reader_credentials': return 'The provider rejected server access. The site owner needs to check its configuration.';
    case 'reader_upstream': return 'The provider had a temporary server error. Retry this reader later or use the other result.';
    case 'reader_configuration': return 'The provider rejected the model or request settings. The site owner needs to check its configuration.';
    case 'reader_network': return 'The connection to the provider failed. Retry this reader or use the other result.';
    default: return 'The reader could not complete this photo. Retry this reader or use the other result.';
  }
}
