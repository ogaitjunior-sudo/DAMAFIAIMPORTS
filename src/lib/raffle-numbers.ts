export function formatTicketNumber(number: number, digits = 2) {
  return String(number).padStart(digits, "0");
}

export function formatTicketList(numbers: number[], digits = 2) {
  return numbers.map((number) => formatTicketNumber(number, digits)).join(", ");
}
