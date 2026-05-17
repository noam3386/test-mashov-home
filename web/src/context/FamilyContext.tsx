import { createContext, useContext } from "react";

const FamilyContext = createContext<string>("");

export function FamilyProvider({
  familyId,
  children,
}: {
  familyId: string;
  children: React.ReactNode;
}) {
  return (
    <FamilyContext.Provider value={familyId}>{children}</FamilyContext.Provider>
  );
}

export function useFamilyId(): string {
  return useContext(FamilyContext);
}
