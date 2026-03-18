import type { MessageStatus } from '@/types';
import { Check, CheckCheck } from 'lucide-react';

interface ReadReceiptProps {
  status: MessageStatus;
}

const ReadReceipt = ({ status }: ReadReceiptProps) => {
  if (status === 'sent') {
    return <Check className="w-3.5 h-3.5 text-muted-foreground/60 inline-block ml-1" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground/60 inline-block ml-1" />;
  }
  // read
  return <CheckCheck className="w-3.5 h-3.5 text-primary inline-block ml-1" />;
};

export default ReadReceipt;
