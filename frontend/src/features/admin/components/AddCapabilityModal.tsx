import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../shared/components/Button";
import { ChevronDownIcon } from "../../../shared/components/Icons";
import { FloatingPopover } from "../../../shared/components/FloatingPopover";
import { ModalShell } from "../../../shared/components/ModalShell";
import { sanitizeText } from "../../../shared/lib/validation";

type CapabilityLevel = "Entry" | "Mid" | "Senior" | "Senior Lead";

type AddCapabilityModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (payload: { level: CapabilityLevel; capability: string }) => void;
  initialValue?: { level: CapabilityLevel; capability: string };
  title?: string;
  saveLabel?: string;
  showSaveAndAddAnother?: boolean;
};

const LEVEL_OPTIONS: CapabilityLevel[] = ["Entry", "Mid", "Senior", "Senior Lead"];

export function AddCapabilityModal({
  open,
  onClose,
  onSave,
  initialValue,
  title = "Add New Capability",
  saveLabel = "Save",
  showSaveAndAddAnother = true
}: AddCapabilityModalProps) {
  const [level, setLevel] = useState<CapabilityLevel | "">("");
  const [capability, setCapability] = useState("");
  const [errors, setErrors] = useState<{ level?: string; capability?: string }>({});
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const levelTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setLevel(initialValue?.level ?? "");
      setCapability(initialValue?.capability ?? "");
      setErrors({});
      setIsLevelOpen(false);
    }
  }, [open, initialValue]);

  const levelLabel = useMemo(() => level || "Placeholder", [level]);

  const validate = () => {
    const nextErrors: { level?: string; capability?: string } = {};
    if (!level) {
      nextErrors.level = "Capability level is required.";
    }
    if (!sanitizeText(capability, 240)) {
      nextErrors.capability = "Capability is required.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !level) {
      return null;
    }

    return { level, capability: sanitizeText(capability, 240) };
  };

  const saveAndReset = (keepOpen: boolean) => {
    const payload = validate();
    if (!payload) {
      return;
    }

    onSave(payload);
    setLevel(initialValue?.level ?? "");
    setCapability(initialValue?.capability ?? "");
    setErrors({});
    setIsLevelOpen(false);
    if (!keepOpen) {
      onClose();
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveAndReset(false);
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
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium leading-5 text-[#070a13]">Capability Level</label>
          <div ref={levelTriggerRef} className="relative">
            <button
              type="button"
              onClick={() => setIsLevelOpen((previous) => !previous)}
              className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-base leading-6 ${
                errors.level ? "border-[#f1080c]" : "border-[#d1d1d1]"
              } ${level ? "text-[#242424]" : "text-[#797979]"}`}
            >
              <span>{levelLabel}</span>
              <ChevronDownIcon className="h-5 w-5 text-black" />
            </button>

            <FloatingPopover
              open={isLevelOpen}
              anchorRef={levelTriggerRef}
              align="start"
              className="w-[180px] rounded bg-white p-2 shadow-[0_6px_12px_rgba(148,163,184,0.15)]"
              onRequestClose={() => setIsLevelOpen(false)}
            >
              <div>
                {LEVEL_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setLevel(option);
                      setErrors((previous) => ({ ...previous, level: undefined }));
                      setIsLevelOpen(false);
                    }}
                    className="block w-full rounded px-2 py-2 text-left text-sm text-black hover:bg-slate-100"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </FloatingPopover>
          </div>
          {errors.level ? <p className="text-xs text-[#f1080c]">{errors.level}</p> : null}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium leading-5 text-[#070a13]">Capability</label>
          <textarea
            value={capability}
            onChange={(event) => {
              setCapability(event.target.value);
              setErrors((previous) => ({ ...previous, capability: undefined }));
            }}
            rows={5}
            placeholder="Describe the capability clearly and specifically"
            className={`w-full rounded border px-3 py-2 text-base leading-6 text-[#242424] outline-none placeholder:text-[#64748b] ${
              errors.capability ? "border-[#f1080c]" : "border-[#cbd5e1]"
            }`}
          />
          {errors.capability ? <p className="text-xs text-[#f1080c]">{errors.capability}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-4">
          <Button variant="secondary" className="h-9 px-6" onClick={onClose}>
            Cancel
          </Button>
          {showSaveAndAddAnother ? (
            <Button
              variant="secondary"
              className="h-9 whitespace-nowrap px-6"
              onClick={() => saveAndReset(true)}
            >
              Save & Add Another
            </Button>
          ) : null}
          <Button variant="primary" className="h-9 px-6" type="submit">
            {saveLabel}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
