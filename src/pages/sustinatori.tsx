import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: "/parteneri", permanent: false },
});

export default function SustinatoriRedirect() {
  return null;
}
