export type Post = {
  id: number;
  title: string;
  content: string;
  date: Date;
  link: string;
};

export type Member = {
  id: number;
  name: string;
  status: string;
  is_council: boolean;
  link: string | null;
};

export type Project = {
  id: number;
  title: string;
  content: string;
  type: "a" | "r" | (string & {});
};
