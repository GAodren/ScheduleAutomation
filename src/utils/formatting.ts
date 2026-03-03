const BLUE_TIMES = ['09h30', '09h45', '11h', '11h15', '18h', '18h15'];
const YELLOW_TIMES = ['23h30', '00h'];

export function formatDisplay(text: string): string {
  if (!text) return '';

  let result = text;
  BLUE_TIMES.forEach(t => {
    const regex = new RegExp(`\\b${t}\\b`, 'gi');
    result = result.replace(regex, `<span class="highlight-time">${t}</span>`);
  });
  YELLOW_TIMES.forEach(t => {
    const regex = new RegExp(`\\b${t}\\b`, 'gi');
    result = result.replace(regex, `<span class="highlight-late">${t}</span>`);
  });
  return result;
}
