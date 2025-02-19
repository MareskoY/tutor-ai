'use client';

import { Button } from '@/components/ui/button';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import { ShareIcon } from '@/components/icons';

export function ShareDialogButton({ chatId }: { chatId: string }) {
  const { setVisibilityType } = useChatVisibility({
    chatId,
    initialVisibility: 'private',
  });
  const [_, copyToClipboard] = useCopyToClipboard();

  const handleShare = async () => {
    try {
      setVisibilityType('public');
      const publicLink = `${window.location.origin}/chat/${chatId}`;
      await navigator.clipboard.writeText(publicLink);

      await copyToClipboard(publicLink as string);
      window.parent.postMessage(
        {
          action: 'tax-expert-copy-to-clipboard',
          content: publicLink,
        },
        '*',
      );
    } catch (error) {
      console.error('Failed to share chat link:', error);
      toast.error('Failed to copy link. Please try again.');
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleShare}
      className={`flex gap-2 items-center`}
    >
      <ShareIcon />
      <span className={'sr-only md:not-sr-only'}>Share</span>
    </Button>
  );
}
