import { FormEvent, useEffect, useState } from "react";
import { Button } from "../../../shared/components/Button";
import { FormInputField } from "../../../shared/components/FormInputField";
import { ModalShell } from "../../../shared/components/ModalShell";
import { sanitizeText } from "../../../shared/lib/validation";

type AddSkillModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (skillName: string) => void;
  initialValue?: string;
  title?: string;
  saveLabel?: string;
};

export function AddSkillModal({
  open,
  onClose,
  onSave,
  initialValue,
  title = "Add New Skill",
  saveLabel = "Save"
}: AddSkillModalProps) {
  const [skill, setSkill] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSkill(initialValue ?? "");
      setError("");
    }
  }, [open, initialValue]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = sanitizeText(skill, 120);

    if (!value) {
      setError("Skill is required.");
      return;
    }

    onSave(value);
    setSkill("");
    setError("");
    onClose();
  };

  return (
    <ModalShell
      open={open}
      title={title}
      onClose={onClose}
      maxWidthClassName="max-w-[560px]"
      showHeaderDivider={false}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormInputField
          label="Skill"
          value={skill}
          onChange={(value) => {
            setSkill(value);
            setError("");
          }}
          error={error}
        />

        <div className="flex items-center gap-4">
          <Button variant="secondary" className="h-9 w-full" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="h-9 w-full" type="submit">
            {saveLabel}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
