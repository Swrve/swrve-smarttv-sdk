export default interface IQACurrencyGivenEvent{
     log_source: "sdk";
     log_details: {
         type: "currency_given",
         parameters: {
             given_amount: number,
             given_currency: string,
        },
         seqnum: number,
         client_time: number,
     };
    type: "qa_log_event";
    time: number;
    log_type: "event";
}
