import { useMutation } from '@tanstack/react-query';

import { askDecide } from './api';

export function useDecide() {
  return useMutation({
    mutationFn: (question: string) => askDecide(question),
  });
}
