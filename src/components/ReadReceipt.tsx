import type { MessageStatus } from '@/types';
import { Check, CheckCheck } from 'lucide-react';

interface ReadReceiptProps {
  status: MessageStatus;
}

const ReadReceipt = ({ status }: ReadReceiptProps) => {
  if (status === 'sent') {
    return <Check className="w-3.5 h-3.5 text-muted-foreground/60 inline-block ml-0.5" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground/60 inline-block ml-0.5" />;
  }
  // read - WhatsApp blue ticks
  return <CheckCheck className="w-3.5 h-3.5 text-wa-blue-tick inline-block ml-0.5" />;
};

export default ReadReceipt;
