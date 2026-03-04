import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CandidateRecord, fetchCandidateById } from "../../admin/data/candidatesDb";
import { Button } from "../../../shared/components/Button";
import { APP_ROUTES } from "../../../shared/config/routes";

const brandLogo = "https://www.figma.com/api/mcp/asset/18a2c059-6d4d-42f8-a8b2-1256d07938c5";

export function CandidateSkillStartPage() {
  const { candidateId = "candidate" } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<CandidateRecord | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchCandidateById(candidateId).then((record) => {
      if (mounted) {
        setCandidate(record);
      }
    });
    return () => {
      mounted = false;
    };
  }, [candidateId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1f5f9] px-8 py-20">
      <section className="w-full max-w-[754px] rounded-2xl bg-white p-8 shadow-[0_10px_20px_rgba(148,163,184,0.15)]">
        <div className="flex justify-center pb-8">
          <img src={brandLogo} alt="Chromedia" className="h-[70px] w-[347px] object-cover" />
        </div>

        <div className="flex flex-col items-center gap-6">
          <p className="w-full text-center text-[42px] font-semibold leading-[56px] text-[#667085]">
            Hi, {candidate?.name ?? "Candidate"}!
          </p>
          <p className="w-full text-center text-[24px] font-semibold leading-8 text-[#494949]">
            You&apos;ve been shortlisted by our recruitment team 🎉
            <br />
            Just update your key skills so we can match you with the right opportunities.
          </p>
          <Button
            variant="primary"
            className="h-[60px] w-[226px] rounded-lg px-8 text-[18px] font-medium leading-7"
            onClick={() => navigate(APP_ROUTES.candidate.skills(candidate?.id ?? candidateId))}
          >
            Start adding skills
          </Button>
        </div>
      </section>
    </main>
  );
}
