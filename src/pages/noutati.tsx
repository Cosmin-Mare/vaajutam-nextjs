import type { GetServerSideProps } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { loadPosts } from "@/lib/queries";

type PostRow = {
  id: number;
  title: string;
  content: string;
  date: string;
  link: string;
};

type Props = { posts: PostRow[]; subscribed: boolean };

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const subscribed = ctx.query.subscribed === "1";
  const posts = await loadPosts();
  const rows: PostRow[] = posts.map((p) => ({
    ...p,
    date: p.date instanceof Date ? p.date.toISOString() : String(p.date),
  }));
  return { props: { posts: rows, subscribed } };
};

export default function NoutatiPage({ posts, subscribed }: Props) {
  return (
    <>
      <Head>
        <title>Noutăți | Vă ajutam din Dej</title>
      </Head>
      <section id="description">
        <div className="px-4 mt-5 text-center news-description">
          <h1 className="display-5 fw-bold text-body-emphasis projects-title">Noutăți</h1>
          <div className="col-lg-8 mx-auto">
            <p className="lead mb-4">
              Aici găsești cele mai recente noutăți și activități care definesc misiunea noastră.
            </p>
          </div>
          {subscribed ? (
            <div className="projects-title">
              <h1>V-ați abonat cu succes la newsletter! Vă mulțumim pentru interes!</h1>
            </div>
          ) : (
            <form
              className="row d-flex justify-content-center email-form"
              action="/api/newsletter"
              method="post"
            >
              <div className="col-sm-12 col-lg-5">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email"
                  id="email"
                  name="email"
                  required
                />
              </div>
              <div className="col-sm-12 col-lg-4">
                <button type="submit" className="btn btn-primary-pink-round btn-lg px-4">
                  Abonează-te pentru noutăți
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
      <section id="posts">
        <div className="album py-5 bg-body-tertiary">
          <div className="container">
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3 post-album">
              {posts.map((post) => (
                <div className="col" key={post.id}>
                  <div className="card shadow-sm">
                    <Link className="post-img-link" href={`/noutate/${post.id}`}>
                      <img src={`/images/posts/${post.id}/thumbnail.webp`} alt="" />
                    </Link>
                    <div className="card-body">
                      <h2 className="card-text">{post.title}</h2>
                      <div className="d-flex justify-content-between align-items-center">
                        <a
                          className="text-body-secondary"
                          href={post.link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="30"
                            height="24"
                            viewBox="0 0 50 50"
                            style={{ fill: "#cb0069c1", marginRight: 10 }}
                          >
                            <path d="M25,3C12.85,3,3,12.85,3,25c0,11.03,8.125,20.137,18.712,21.728V30.831h-5.443v-5.783h5.443v-3.848 c0-6.371,3.104-9.168,8.399-9.168c2.536,0,3.877,0.188,4.512,0.274v5.048h-3.612c-2.248,0-3.033,2.131-3.033,4.533v3.161h6.588 l-0.894,5.783h-5.694v15.944C38.716,45.318,47,36.137,47,25C47,12.85,37.15,3,25,3z" />
                          </svg>
                        </a>
                        <small className="text-body-secondary">
                          {new Date(post.date).toLocaleDateString("en-GB")}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section id="call-to-action">
        <div className="px-4 my-5 text-center">
          <Image
            className="d-block mx-auto mb-4"
            src="/images/logo.png"
            alt=""
            width={100}
            height={100}
          />
          <h1 className="display-5 fw-bold text-body-emphasis projects-title">Fii parte din schimbare</h1>
          <div className="col-lg-8 mx-auto">
            <p className="lead mb-4">Orice contribuție are o valoare inestimabilă.</p>
            <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
              <Link className="btn btn-primary-pink-round btn-lg px-4 gap-3 mx-5" href="/cum-pot-ajuta#donez">
                Donează
              </Link>
              <Link className="btn btn-secondary-pink btn-lg px-4 mx-5" href="/cum-pot-ajuta">
                Cum poți ajuta
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
