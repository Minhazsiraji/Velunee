import { MarkdownStream, type MarkdownStyleMap } from '@ronradtke/react-native-markdown-display';
import { memo } from 'react';
import { Linking, Platform } from 'react-native';

import { colors } from '@/theme/colors';

interface MarkdownMessageProps {
  content: string;
  isStreaming: boolean;
}

const monospaceFont = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: 'monospace',
});

const markdownStyles: MarkdownStyleMap = {
  body: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
  },
  heading1: {
    marginTop: 6,
    marginBottom: 10,
    color: colors.text,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
  },
  heading2: {
    marginTop: 6,
    marginBottom: 9,
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  heading3: {
    marginTop: 5,
    marginBottom: 8,
    color: colors.text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '700',
  },
  heading4: {
    marginTop: 4,
    marginBottom: 7,
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
  },
  heading5: {
    marginTop: 4,
    marginBottom: 6,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  heading6: {
    marginTop: 4,
    marginBottom: 6,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  strong: {
    color: colors.text,
    fontWeight: '800',
  },
  em: {
    color: colors.text,
    fontStyle: 'italic',
  },
  s: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  link: {
    color: colors.primaryLight,
    textDecorationLine: 'underline',
  },
  blocklink: {
    borderBottomWidth: 0,
  },
  blockquote: {
    marginTop: 4,
    marginBottom: 10,
    marginLeft: 0,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryMuted,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
  },
  bullet_list: {
    marginBottom: 8,
  },
  ordered_list: {
    marginBottom: 8,
  },
  list_item: {
    marginBottom: 4,
  },
  bullet_list_icon: {
    marginLeft: 4,
    marginRight: 9,
    color: colors.primaryLight,
  },
  ordered_list_icon: {
    marginLeft: 4,
    marginRight: 9,
    color: colors.primaryLight,
  },
  bullet_list_content: {
    flex: 1,
  },
  ordered_list_content: {
    flex: 1,
  },
  code_inline: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    color: '#E8DCFF',
    backgroundColor: colors.background,
    fontFamily: monospaceFont,
    fontSize: 14,
  },
  code_block: {
    marginVertical: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    color: '#E8DCFF',
    backgroundColor: colors.background,
    fontFamily: monospaceFont,
    fontSize: 13,
    lineHeight: 19,
  },
  fence: {
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  fence_header: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  fence_language_label: {
    color: colors.textMuted,
    fontFamily: monospaceFont,
    fontSize: 11,
  },
  fence_copy_text: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  fence_code: {
    padding: 12,
    backgroundColor: colors.background,
  },
  fence_token: {
    color: '#E8DCFF',
    fontFamily: monospaceFont,
    fontSize: 13,
    lineHeight: 19,
  },
  hr: {
    height: 1,
    marginVertical: 12,
    backgroundColor: colors.border,
  },
  table: {
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 7,
  },
  thead: {
    backgroundColor: colors.surfaceElevated,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  th: {
    flex: 1,
    padding: 7,
  },
  td: {
    flex: 1,
    padding: 7,
  },
  hardbreak: {
    width: '100%',
    height: 1,
  },
};

function isSafeExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function MarkdownMessageComponent({
  content,
  isStreaming,
}: MarkdownMessageProps): React.JSX.Element {
  const handleLinkPress = (url: string): boolean => {
    if (!isSafeExternalUrl(url)) {
      return false;
    }

    void Linking.openURL(url);
    return false;
  };

  return (
    <MarkdownStream
      colorScheme="dark"
      streaming={isStreaming}
      cursorColor={colors.primaryLight}
      cursorStyle={{
        height: 17,
        marginTop: 1,
        width: 2,
      }}
      style={markdownStyles}
      allowedImageHandlers={['https://']}
      defaultImageHandler={null}
      onLinkPress={handleLinkPress}
    >
      {content}
    </MarkdownStream>
  );
}

export const MarkdownMessage = memo(MarkdownMessageComponent);
