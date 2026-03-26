import React from 'react';
import { Hero } from '../components/home/Hero';
import { SenelProductsPromo } from '../components/home/SenelProductsPromo';
import { Categories } from '../components/home/Categories';
import { TrendingProducts } from '../components/home/TrendingProducts';
import { FeaturedSuppliers } from '../components/home/FeaturedSuppliers';
import './HomePage.css';

export const HomePage: React.FC = () => {
  return (
    <main className="home-page">
      <Hero />
      <SenelProductsPromo />
      <Categories />
      <TrendingProducts />
      <FeaturedSuppliers />
    </main>
  );
};
