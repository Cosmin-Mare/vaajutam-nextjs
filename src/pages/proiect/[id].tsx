import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { SeoHead } from "@/components/site/SeoHead";
import { resolveProjectGallery } from "@/lib/cms-media";
import { splitPostContent } from "@/lib/content";
import { getProjectById, loadProjects } from "@/lib/queries";
import { LIST_REVALIDATE } from "@/lib/revalidate";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  excerptFromPlainText,
  projectCreativeWorkJsonLd,
  SITE_NAME,
} from "@/lib/seo";

type ProjectProps = {
  id: number;
  title: string;
  content: string;
  type: string;
};

type PageProps = { project: ProjectProps; photos: string[]; thumbnail: string };

export const getStaticPaths: GetStaticPaths = async () => {
  const projects = await loadProjects();
  return {
    paths: projects.map((p) => ({ params: { id: String(p.id) } })),
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (ctx) => {
  const raw = ctx.params?.id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (Number.isNaN(id)) return { notFound: true };
  const project = await getProjectById(id);
  if (!project) return { notFound: true };

  const { photos, thumbnail } = resolveProjectGallery(project);
  return {
    props: {
      project: {
        id: project.id,
        title: project.title,
        content: project.content,
        type: project.type,
      },
      photos,
      thumbnail,
    },
    revalidate: LIST_REVALIDATE,
  };
};

export default function ProiectPage({ project, photos, thumbnail }: PageProps) {
  const contents = splitPostContent(project.content);
  const description = excerptFromPlainText(project.content);
  const pagePath = `/proiect/${project.id}`;
  const pageUrl = absoluteUrl(pagePath);
  const thumbAbs = absoluteUrl(thumbnail);
  const crumbs = breadcrumbJsonLd([
    { name: "Acasă", path: "/" },
    { name: "Proiecte", path: "/proiecte" },
    { name: project.title, path: pagePath },
  ]);
  const workLd = projectCreativeWorkJsonLd({
    name: project.title,
    url: pageUrl,
    image: thumbAbs,
    description,
  });

  return (
    <>
      <SeoHead
        title={`${project.title} | Proiect | ${SITE_NAME}`}
        description={description}
        path={pagePath}
        ogImagePath={thumbnail}
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(workLd) }}
        />
      </Head>
      <section id="main">
        <div className="col-12 d-flex justify-content-center pt-3">
          <div className="col-10">
            <h1 className="post-title projects-title">{project.title}</h1>
          </div>
        </div>
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
                className="btn btn-primary-pink-round btn-lg px-4 gap-3 mx-5 mx-lg-0"
                href="/cum-pot-ajuta#donez"
              >
                Donează
              </Link>
              <Link className="btn btn-secondary-pink btn-lg px-4 mx-5" href="/cum-pot-ajuta">
                Cum poți ajuta
              </Link>
            </div>
          </div>
        </div>
      </section>
      <div className="header-wrapper photo">
        <img
          src={thumbnail}
          className="d-block w-100 project-img"
          id="carousel-img-1"
          alt={`Imagine principală: ${project.title}`}
        />
      </div>
      <div className="photos-container">
        <div className="photos">
          {photos.map((p, i) => (
            <div className="photo" key={p}>
              <img src={p} alt={`${project.title} — fotografie ${i + 1}`} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
