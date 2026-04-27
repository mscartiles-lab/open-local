import { useState, useEffect, useCallback } from 'react';

type FavoritesState = {
  vendorIds: number[];
  productIds: number[];
};

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritesState>(() => {
    try {
      const stored = localStorage.getItem('open-local:favorites');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // ignore
    }
    return { vendorIds: [], productIds: [] };
  });

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'open-local:favorites') {
        if (e.newValue) {
          try {
            setFavorites(JSON.parse(e.newValue));
          } catch {
            // ignore
          }
        }
      }
    };
    
    // Custom event listener for same-window updates
    const handleCustomStorage = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setFavorites(customEvent.detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('open-local:favorites-update', handleCustomStorage);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('open-local:favorites-update', handleCustomStorage);
    };
  }, []);

  const saveFavorites = useCallback((newFavorites: FavoritesState) => {
    setFavorites(newFavorites);
    localStorage.setItem('open-local:favorites', JSON.stringify(newFavorites));
    
    // Dispatch for other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'open-local:favorites',
      newValue: JSON.stringify(newFavorites)
    }));
    
    // Dispatch for same tab
    window.dispatchEvent(new CustomEvent('open-local:favorites-update', {
      detail: newFavorites
    }));
  }, []);

  const isFavoriteVendor = useCallback((id: number) => favorites.vendorIds.includes(id), [favorites.vendorIds]);
  const isFavoriteProduct = useCallback((id: number) => favorites.productIds.includes(id), [favorites.productIds]);

  const toggleVendor = useCallback((id: number) => {
    const newVendorIds = isFavoriteVendor(id)
      ? favorites.vendorIds.filter(vId => vId !== id)
      : [...favorites.vendorIds, id];
    saveFavorites({ ...favorites, vendorIds: newVendorIds });
  }, [favorites, isFavoriteVendor, saveFavorites]);

  const toggleProduct = useCallback((id: number) => {
    const newProductIds = isFavoriteProduct(id)
      ? favorites.productIds.filter(pId => pId !== id)
      : [...favorites.productIds, id];
    saveFavorites({ ...favorites, productIds: newProductIds });
  }, [favorites, isFavoriteProduct, saveFavorites]);

  return {
    isFavoriteVendor,
    isFavoriteProduct,
    toggleVendor,
    toggleProduct,
    favoriteVendors: favorites.vendorIds,
    favoriteProducts: favorites.productIds,
  };
}
