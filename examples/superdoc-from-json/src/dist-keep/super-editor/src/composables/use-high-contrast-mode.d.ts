export function useHighContrastMode(): {
    isHighContrastMode: import("vue").Ref<boolean, boolean>;
    setHighContrastMode: (value: any) => void;
};
