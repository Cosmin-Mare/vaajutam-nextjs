import Link from "next/link";
import { SeoHead } from "@/components/site/SeoHead";
import { FORM230_ORG, form230TaxYear } from "@/lib/form230-config";
import { SITE_NAME } from "@/lib/seo";

export default function Form230PrivacyPage() {
  const taxYear = form230TaxYear();
  return (
    <>
      <SeoHead
        title={`Confidențialitate Formular 230 | ${SITE_NAME}`}
        description={`Cum prelucrăm datele personale pentru Formularul 230 (${FORM230_ORG.nameDisplay}).`}
        path="/230/confidentialitate"
      />
      <article className="page-230-privacy">
        <h1 className="projects-title">Informare privind datele personale — Formular 230</h1>
        <p className="lead">
          Această pagină explică ce date folosim când completezi Formularul 230 pe
          vaajutamdindej.ro/230 (sau din pagina „Cum poți ajuta”), în ce scop, cui le transmitem și
          cât le păstrăm.
        </p>

        <h2>Cine prelucrează datele</h2>
        <p>
          Operator: <strong>{FORM230_ORG.nameDisplay}</strong>, CIF {FORM230_ORG.cui},{" "}
          {FORM230_ORG.address}. Email:{" "}
          <a href={`mailto:${FORM230_ORG.email}`}>{FORM230_ORG.email}</a>. Telefon:{" "}
          <a href={`tel:+40${FORM230_ORG.phone.replace(/^0/, "")}`}>{FORM230_ORG.phone}</a>.
        </p>

        <h2>Ce date colectăm</h2>
        <ul>
          <li>Nume, prenume, CNP</li>
          <li>Localitate și județ</li>
          <li>Semnătura olografă desenată în formular</li>
          <li>Opțiunea 1 an / 2 ani</li>
        </ul>
        <p>
          <strong>Cartea de identitate:</strong> dacă alegi scanarea (pe acest dispozitiv sau prin
          codul QR, pe telefon), poza este citită doar pe dispozitivul de pe care fotografiezi, ca
          să precompletăm numele, prenumele și CNP-ul. Imaginea nu este încărcată pe server, nu
          este salvată și nu o folosim după ce datele au fost extrase. Dacă scanezi QR-ul de pe
          calculator, numele, prenumele și CNP-ul pot fi păstrate temporar (cel mult 15 minute),
          ca să apară în formularul deschis pe calculator. Adresa nu se preia din CI (pe cărțile
          noi nu mai este tipărită).
        </p>

        <h2>De ce le folosim</h2>
        <ul>
          <li>să completăm Formularul 230 (PDF) conform modelului ANAF;</li>
          <li>
            să depunem datele la ANAF prin borderoul B230, pentru redirecționarea a până la 3,5%
            din impozitul pe venitul din {taxYear};
          </li>
          <li>să verificăm că CNP-ul este valid și că nu ai mai trimis același formular în campania
            curentă.
          </li>
        </ul>

        <h2>Temei</h2>
        <p>
          Prelucrarea pentru Formularul 230 se bazează pe acordul tău (bifa obligatorie din
          formular) și pe obligațiile fiscale legate de depunerea cererii la ANAF.
        </p>

        <h2>Cui transmitem datele</h2>
        <ul>
          <li>
            <strong>ANAF</strong> — prin PDF-ul generat și, după verificare, prin fișierul XML B230
            (borderou) folosit la depunerea electronică.
          </li>
          <li>
            <strong>Persoanele autorizate din asociație</strong> — doar în aplicația de
            administrare, protejată prin autentificare. În liste, CNP-ul apare mascat.
          </li>
          <li>
            <strong>Copie de siguranță</strong> — PDF-ul poate fi salvat și în Google Drive al
            asociației, ca să nu se piardă la depunere.
          </li>
        </ul>
        <p>Nu vindem datele și nu le folosim pentru publicitate către terți.</p>

        <h2>Cât timp le păstrăm</h2>
        <p>
          Păstrăm formularul (inclusiv PDF-ul și semnătura) pe durata campaniei și apoi cât este
          necesar pentru depunerea la ANAF și pentru obligațiile legale de arhivare fiscală
          (în practică până la 10 ani pentru documentele justificative). După aceea, datele se
          șterg sau se anonimizează. Poza CI nu este păstrată deloc.
        </p>

        <h2>Drepturile tale</h2>
        <p>
          Poți cere acces, rectificare, ștergere (în limitele obligațiilor fiscale), restricționare
          sau opoziție. Scrie-ne la{" "}
          <a href={`mailto:${FORM230_ORG.email}`}>{FORM230_ORG.email}</a>. Ai și dreptul de a te
          adresa Autorității Naționale de Supraveghere a Prelucrării Datelor cu Caracter Personal
          (ANSPDCP).
        </p>

        <p>
          <Link href="/230">Înapoi la Formularul 230</Link>
        </p>
      </article>
    </>
  );
}
