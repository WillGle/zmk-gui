export interface AppFooterProps {
  onShowAbout: () => void;
  onShowLicenseNotice: () => void;
}

export const AppFooter = ({
  onShowAbout,
  onShowLicenseNotice,
}: AppFooterProps) => {
  return (
    <div className="grid justify-center p-1 bg-base-200">
      <div>
        <span>&copy; 2026 - The ZMK Contributors</span> -{" "}
        <button type="button" className="hover:text-primary hover:cursor-pointer" onClick={onShowAbout}>
          About ZMK Studio
        </button>{" "}
        -{" "}
        <button type="button" className="hover:text-primary hover:cursor-pointer" onClick={onShowLicenseNotice}>
          License NOTICE
        </button>
      </div>
    </div>
  );
};
