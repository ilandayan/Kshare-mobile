import { ImageSourcePropType } from 'react-native';

/**
 * Default cover images per commerce type.
 * Used when the commerce hasn't uploaded a custom cover image.
 */
export const COMMERCE_TYPE_IMAGES: Record<string, ImageSourcePropType> = {
  Boucherie:   require('@/assets/defaults/boucherie.jpg'),
  Boulangerie: require('@/assets/defaults/boulangerie.jpg'),
  'Supermarché': require('@/assets/defaults/supermarche.jpg'),
  Traiteur:    require('@/assets/defaults/traiteur.jpg'),
  'Épicerie':  require('@/assets/defaults/epicerie.jpg'),
  Restaurant:  require('@/assets/defaults/restaurant.jpg'),
};

/**
 * Returns the appropriate cover image for a commerce card.
 * Priority: custom photo URL > default by commerce type > null (fallback to placeholder)
 */
export function getCommerceImage(
  photos: string[] | null | undefined,
  commerceType: string | null | undefined,
): { uri: string } | ImageSourcePropType | null {
  // 1. Custom uploaded photo
  if (photos && photos.length > 0 && photos[0]) {
    return { uri: photos[0] };
  }

  // 2. Default image by commerce type
  if (commerceType && COMMERCE_TYPE_IMAGES[commerceType]) {
    return COMMERCE_TYPE_IMAGES[commerceType];
  }

  // 3. No image available — caller should show colored placeholder
  return null;
}
