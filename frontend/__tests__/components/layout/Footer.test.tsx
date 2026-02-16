import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Footer from '@/components/layout/Footer';

describe('Footer', () => {
  it('renderar varumärke och copyright', () => {
    render(<Footer />);

    expect(screen.getByText('PrisKombo')).toBeInTheDocument();
    // Copyright med nuvarande år
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
  });

  it('renderar navigeringslänkar med korrekta hrefs', () => {
    render(<Footer />);

    const searchLink = screen.getByRole('link', { name: /Sök produkter/i });
    expect(searchLink).toHaveAttribute('href', '/');
  });

  it('renderar alla tre kolumner', () => {
    render(<Footer />);

    // Kolumn 1: PrisKombo
    expect(screen.getByText('PrisKombo')).toBeInTheDocument();
    
    // Kolumn 2: Upptäck
    expect(screen.getByText('Upptäck')).toBeInTheDocument();
    
    // Kolumn 3: Om oss
    expect(screen.getByText('Om oss')).toBeInTheDocument();
    expect(screen.getByText('Kontakt')).toBeInTheDocument();
    expect(screen.getByText('Integritetspolicy')).toBeInTheDocument();
  });

  it('renderar beskrivningstexten', () => {
    render(<Footer />);

    expect(screen.getByText(/billigaste kombinationen/i)).toBeInTheDocument();
  });
});
