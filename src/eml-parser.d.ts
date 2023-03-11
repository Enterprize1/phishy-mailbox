declare module 'eml-parser' {
  import {ReadStream} from 'fs';
  import {Readable} from 'stream';

  type Attachment = {
    filename: string;
    contentType: string;
    content: Buffer;
  };

  type EmbeddedFile = {
    filename: string;
    contentType: string;
    content: Buffer;
  };

  type EmailHeaders = {
    subject: string;
    from: string;
    to: string;
    cc: string;
    date: string;
    inReplyTo: string;
    messageId: string;
  };

  type ConvertOptions = {
    type?: 'pdf' | 'jpeg' | 'png';
    orientation?: 'portrait' | 'landscape';
    format?: 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid';
  };

  type ParseOptions = {
    ignoreEmbedded?: boolean;
  };

  type ParsedAddresses = {
    value: {address: string; name: string}[];
    html: string;
    text: string;
  };

  type ParsedEmail = {
    attachments: Attachment[];
    headers: EmailHeaders;
    headerLines: string[];
    html: string;
    text: string;
    textAsHtml: string;
    subject: string;
    references: string;
    date: string;
    to: ParsedAddresses;
    from: ParsedAddresses;
    cc: string;
    messageId: string;
    inReplyTo: string;
  };

  class EmlParser {
    constructor(file: ReadStream | Readable);

    parseEml(options?: ParseOptions): Promise<ParsedEmail>;

    getEmailHeaders(): Promise<EmailHeaders>;

    getEmailBodyHtml(): Promise<string>;

    getEmailAsHtml(): Promise<string>;

    convertEmailToStream(options?: ConvertOptions): Promise<NodeJS.ReadableStream>;

    convertEmailToBuffer(options?: ConvertOptions): Promise<Buffer>;

    getEmailAttachments(options?: {ignoreEmbedded?: boolean}): Promise<Attachment[]>;

    getEmailEmbeddedFiles(): Promise<EmbeddedFile[]>;
  }

  export = EmlParser;
}
