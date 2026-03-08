import { useEffect } from 'react';

export const usePageTitle = (title: string) => {
  useEffect(() => {
    document.title = title
      ? `${title} · Noch Power`
      : 'Noch Power';
    return () => {
      document.title = 'Noch Power';
    };
  }, [title]);
};
