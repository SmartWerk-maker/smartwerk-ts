export interface QuotesTranslation {
  title: string;
  listTitle: string;
  messagesLoading: string;
  messagesEmpty: string;

  // header buttons
  newQuote: string;
  backToDashboard: string;

  // filters
  from: string;
  to: string;
  status: string;
  statusAll: string;
  statusDraft: string;
  statusSent: string;
  statusAccepted: string;
  statusRejected: string;

  searchLabel: string;
  searchPlaceholder: string;

  sortBy: string;
  sortDateDesc: string;
  sortDateAsc: string;
  sortNumberDesc: string;
  sortNumberAsc: string;
  sortAmountDesc: string;
  sortAmountAsc: string;
  reset: string;

  // table columns
  colNumber: string;
  colClient: string;
  colStatus: string;
  colDate: string;
  colTotal: string;
  colActions: string;

  // action buttons
  actionEdit: string;
  actionDelete: string;
  actionPdf: string;
  actionPdfPro: string;
  actionConvert: string;
}