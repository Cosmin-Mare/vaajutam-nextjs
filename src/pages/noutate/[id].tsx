import path from "node:path";
import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { SeoHead } from "@/components/site/SeoHead";
import { splitPostContent } from "@/lib/content";
import { postPhotoPaths } from "@/lib/gallery";
import { getPostById, loadPosts } from "@/lib/queries";
import { LIST_REVALIDATE } from "@/lib/revalidate";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  excerptFromPlainText,
  newsArticleJsonLd,
  SITE_NAME,
} from "@/lib/seo";

type PostProps = {
  id: number;
  title: string;
  content: string;
  date: string;
  link: string;
};

type PageProps = { post: PostProps; photos: string[]; thumbnail: string };

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await loadPosts();
  return {
    paths: posts.map((p) => ({ params: { id: String(p.id) } })),
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (ctx) => {
  const raw = ctx.params?.id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (Number.isNaN(id)) return { notFound: true };
  const post = await getPostById(id);
  if (!post) return { notFound: true };

  const { photos, thumbnail } = postPhotoPaths(post.id, path.join(process.cwd(), "public"));
  const serial: PostProps = {
    ...post,
    date: post.date instanceof Date ? post.date.toISOString() : String(post.date),
  };
  return { props: { post: serial, photos, thumbnail }, revalidate: LIST_REVALIDATE };
};

export default function NoutatePage({ post, photos, thumbnail }: PageProps) {
  const contents = splitPostContent(post.content);
  const description = excerptFromPlainText(post.content);
  const pagePath = `/noutate/${post.id}`;
  const pageUrl = absoluteUrl(pagePath);
  const thumbAbs = absoluteUrl(thumbnail);
  const crumbs = breadcrumbJsonLd([
    { name: "Acasă", path: "/" },
    { name: "Noutăți", path: "/noutati" },
    { name: post.title, path: pagePath },
  ]);
  const articleLd = newsArticleJsonLd({
    headline: post.title,
    url: pageUrl,
    imageUrls: [thumbAbs],
    datePublished: post.date,
  });

  return (
    <>
      <SeoHead
        title={`${post.title} | Noutăți | ${SITE_NAME}`}
        description={description}
        path={pagePath}
        ogImagePath={thumbnail}
        ogType="article"
        articlePublishedTime={post.date}
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
        />
      </Head>
      <section id="main">
        <div
          className="container-fluid carousel-container bg-white"
          style={{ ["--bs-bg-opacity" as string]: 0.65 }}
        >
          <h1 className="post-title">{post.title}</h1>
        </div>
        <img
          src={thumbnail}
          className="d-block w-100 header-img"
          id="carousel-img-1"
          alt={`Imagine articol: ${post.title}`}
        />
      </section>
      <section className="post-content">
        <div className="my-5">
          <div className="col-lg-11 col-sm-11 col-10 mx-auto">
            {contents.map((c, i) => (
              <p className="lead mb-4" key={i}>
                {c}
              </p>
            ))}
            <div className="d-grid gap-2 d-sm-flex post-button-container">
              <Link
                className="btn btn-primary-pink-round btn-lg px-4 gap-3 mx-5 mx-lg-0 mx-md-0 mx-sm-0"
                href="/cum-pot-ajuta#donez"
              >
                Donează
              </Link>
              <Link
                className="btn btn-secondary-pink btn-lg px-4 mx-5"
                href="/cum-pot-ajuta"
              >
                Cum poți ajuta
              </Link>
            </div>
          </div>
        </div>
      </section>
      <div className="photos-container">
        <div className="photos">
          {photos.map((p, i) => (
            <div className="photo" key={p}>
              <img src={p} alt={`${post.title} — fotografie ${i + 1}`} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
