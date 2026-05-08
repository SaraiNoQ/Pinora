import { BookmarkProvider } from '../contexts/BookmarkContext';
import { CategoryProvider } from '../contexts/CategoryContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import Head from 'next/head';
import '../styles/globals.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>书签导航</title>
      </Head>
      <ThemeProvider>
        <CategoryProvider>
          <BookmarkProvider>
            <Component {...pageProps} />
          </BookmarkProvider>
        </CategoryProvider>
      </ThemeProvider>
    </>
  );
}
