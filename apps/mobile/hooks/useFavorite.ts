import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { 
  checkFavorite, 
  createFavorite, 
  deleteFavorite, 
  getCheckFavoriteQueryKey,
  getListFavoritesQueryKey
} from '@workspace/api-client-react';

export type FavoriteContentType = 'discussion' | 'question' | 'answer' | 'listing';

export function useFavorite(contentType: FavoriteContentType, contentId: number) {
  const queryClient = useQueryClient();
  const queryKey = getCheckFavoriteQueryKey(contentType, contentId);
  
  const { data: checkData, isLoading: isQueryLoading } = useQuery({
    queryKey,
    queryFn: () => checkFavorite(contentType, contentId),
    enabled: contentId > 0,
    staleTime: 1000 * 60 * 5,
  });

  const isFavorited = !!checkData?.favorited;

  const { mutate: doCreate, isPending: isCreating } = useMutation({
    mutationFn: () => createFavorite({ contentType, contentId }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, { favorited: true });
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      Alert.alert('Could not save favorite', 'Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: getListFavoritesQueryKey() });
    },
  });

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteFavorite(contentType, contentId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, { favorited: false });
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      Alert.alert('Could not remove favorite', 'Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: getListFavoritesQueryKey() });
    },
  });

  const toggleFavorite = useCallback(() => {
    if (isCreating || isDeleting || isQueryLoading) return;
    if (isFavorited) {
      doDelete();
    } else {
      doCreate();
    }
  }, [isFavorited, isCreating, isDeleting, isQueryLoading, doCreate, doDelete]);

  return {
    isFavorited,
    isLoading: isQueryLoading || isCreating || isDeleting,
    toggleFavorite,
  };
}
