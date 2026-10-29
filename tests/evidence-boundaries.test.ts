import { expect,it } from "vitest";
import { explicitBoundary } from "@/lib/evidence-boundaries";
it.each([
 ["python","Completed introductory Python coursework.","supported","partial"],
 ["docker","No professional experience with Docker, although I am completing beginner exercises.","partial","contradicted"],
 ["docker","No professional experience with Python. Built Docker services.","supported",null],
 ["docker","Previously no professional experience with Docker; now deployed Docker services.","supported",null],
 ["docker","Completed a Docker tutorial. Built Docker production services.","supported",null],
 ["pytorch","Trained PyTorch machine learning models.","supported",null],
 ["python","Completed introductory Python coursework.","unknown",null]
] as const)("bounds %s: %s",(skill,quote,verdict,expected)=>{expect(explicitBoundary(skill,quote,verdict)).toBe(expected);});
it("does not confuse authoring a tutorial with attending one",()=>{expect(explicitBoundary("docker","Authored Docker tutorials for the engineering team.","supported")).toBeNull();});
