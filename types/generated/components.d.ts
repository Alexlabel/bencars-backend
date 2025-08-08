import type { Schema, Struct } from '@strapi/strapi';

export interface PromoModel extends Struct.ComponentSchema {
  collectionName: 'components_promo_models';
  info: {
    displayName: 'Model';
  };
  attributes: {
    description: Schema.Attribute.String;
    image: Schema.Attribute.Media;
    name: Schema.Attribute.String;
  };
}

export interface PromoSlide extends Struct.ComponentSchema {
  collectionName: 'components_promo_slides';
  info: {
    displayName: 'Slide';
  };
  attributes: {
    description: Schema.Attribute.String;
    image: Schema.Attribute.Media;
    title: Schema.Attribute.String;
  };
}

export interface PromoTrim extends Struct.ComponentSchema {
  collectionName: 'components_promo_trims';
  info: {
    displayName: 'Trim';
  };
  attributes: {
    name: Schema.Attribute.String;
    price: Schema.Attribute.Integer;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'promo.model': PromoModel;
      'promo.slide': PromoSlide;
      'promo.trim': PromoTrim;
    }
  }
}
