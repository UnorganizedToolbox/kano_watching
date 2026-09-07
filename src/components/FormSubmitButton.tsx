'use client'

import { useFormStatus } from 'react-dom'

export function FormSubmitButton({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus()

  return (
    <button
      disabled={pending}
      type="submit"
      className={`${className} disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2`}
    >
      {pending ? (
        <><i className="fa-solid fa-circle-notch fa-spin"></i> {pendingLabel}</>
      ) : (
        label
      )}
    </button>
  )
}
