export interface Chat200Response {
  /**
   * Transcription of the audio input
   * @type {string}
   * @memberof Chat200Response
   */
  transcription?: string;

  /**
   * Response from the voice assistant
   * @type {string}
   * @memberof Chat200Response
   */
  assistant_response?: string;

  /**
   * Unique session identifier for the conversation
   * @type {string}
   * @memberof Chat200Response
   */
  session_id?: string;
}
