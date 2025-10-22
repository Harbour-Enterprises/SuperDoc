import * as Unity from '@abbvie-unity/react';
import { useAppDispatch, useAppSelector } from 'hooks/redux/rtk';
import React, { useId, useState } from 'react';
import {
  AuthorizationStep,
  selectAuthStep,
  setAttestation,
} from 'hooks/redux/authorizationSlice';
import SimpleLayout from '../../layouts/Simple';

// FORMAT: YYYY-MM-DD
export const ATTESTATION_LAST_UPDATED_DATE = new Date('2023-06-23T00:00:00');

const UserAttestationModal = ({
  mode = 'write',
  onSubmit = () => {},
}: {
  mode?: 'read' | 'write';
  onSubmit?: () => void;
}) => {
  const dispatch = useAppDispatch();
  const step = useAppSelector(selectAuthStep);
  const [showError, setShowError] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const handleSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (mode === 'read' || isChecked) {
      onSubmit();
      dispatch(setAttestation(new Date()));
    } else {
      setShowError(true);
    }
  };
  const textId = useId();
  return (
    <SimpleLayout>
      <div className="w-full max-w-[1200px]">
        {step === AuthorizationStep.AwaitingNewAttestation && (
          <Unity.Alert status="info" visible>
            Review and confirm our updated terms.
          </Unity.Alert>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col justify-start gap-6 rounded-none bg-white px-12 py-8"
        >
          <Unity.H2 styledAs="h3">WELCOME TO [YOUR-APP]</Unity.H2>

          <Unity.Typography>
            Disclaimers & Attestation for [YOUR-APP] go here.
          </Unity.Typography>

          <Unity.Typography styledAs="body">
            Last updated on {ATTESTATION_LAST_UPDATED_DATE.toLocaleDateString()}
          </Unity.Typography>

          {mode === 'write' && (
            <Unity.Checkbox
              checked={isChecked}
              label="I have read and agree to these Data Use terms"
              onChange={() => setIsChecked(!isChecked)}
              aria-describedby={textId}
            />
          )}

          {showError && (
            <div className="*:text-error-600 inline-flex">
              <Unity.Icon size={20} icon="info-circle" className="mr-2" />
              <Unity.Typography>
                You must agree to Data Use terms to continue
              </Unity.Typography>
            </div>
          )}

          <div className="flex">
            <Unity.Button type="submit" autoFocus={mode === 'read'}>
              Explore [YOUR-APP]
            </Unity.Button>
          </div>
        </form>
      </div>
    </SimpleLayout>
  );
};

export default React.memo(UserAttestationModal);
