import { ReactNode } from "react";

export type TLayout = {
  children: ReactNode;
  title: string;
  pageDescription: string;
  imageUrl?: string;
  restaurantData?: any;
  canonicalUrl?: string;
};
