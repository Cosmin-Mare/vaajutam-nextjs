import type { SponsorPartner } from "@/lib/types";

function SponsorTile({ row }: { row: SponsorPartner }) {
  const inner = (
    <div className="sponsor">
      {row.logoUrl ? (
        <img src={row.logoUrl} alt={row.name} loading="lazy" decoding="async" />
      ) : null}
      {row.name ? <p>{row.name}</p> : <p className="noname" />}
    </div>
  );
  if (row.websiteUrl) {
    return (
      <a href={row.websiteUrl} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return inner;
}

export function ParteneriGrids({
  sponsors,
  partners,
}: {
  sponsors: SponsorPartner[];
  partners: SponsorPartner[];
}) {
  return (
    <>
      <div className="container px-4 py-5">
        <h2 className="pb-2 border-bottom projects-title" id="sponsori">
          Sponsori
        </h2>
      </div>
      <div className="sponsori-grid sponsori">
        {sponsors.map((row) => (
          <SponsorTile key={row.id} row={row} />
        ))}
      </div>

      <div className="container px-4 py-5">
        <h2 className="pb-2 border-bottom projects-title" id="parteneri">
          Parteneri
        </h2>
      </div>
      <div className="sponsori-grid parteneri">
        {partners.map((row) => (
          <SponsorTile key={row.id} row={row} />
        ))}
      </div>
    </>
  );
}
