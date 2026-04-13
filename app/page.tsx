import { HeroSection } from '@/components/home/HeroSection';
import { EventCarousel } from '@/components/home/EventCarousel';
import { AboutSection } from '@/components/home/AboutSection';
import { NumbersStrip } from '@/components/home/NumbersStrip';
import { TopicsSection } from '@/components/home/TopicsSection';
import { GallerySection } from '@/components/home/GallerySection';
import { IcpSection } from '@/components/home/IcpSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { SpeakerSection } from '@/components/home/SpeakerSection';
import { MediaSection } from '@/components/home/MediaSection';
import { EditionTeaser } from '@/components/home/EditionTeaser';
import { CtaSection } from '@/components/home/CtaSection';

export default function Home() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <NumbersStrip />
      <TopicsSection />
      <EventCarousel />
      <GallerySection />
      <SpeakerSection />
      <IcpSection />
      <TestimonialsSection />
      <MediaSection />
      <EditionTeaser />
      <CtaSection />
    </>
  );
}
