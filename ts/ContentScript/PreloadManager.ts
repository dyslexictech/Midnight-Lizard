/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/BaseSettingsManager.ts" />

namespace MidnightLizard.ContentScript
{
    export abstract class IPreloadManager { }

    const mlIsActiveAttribute = "ml-is-active";
    const mlIsActiveProperty = "--" + mlIsActiveAttribute;
    const mlBackgroundLightnessLimitProperty = "--ml-background-lightness-limit";
    const mlPpreloadFilterProperty = "--ml-preload-filter";
    const mlViewAttribute = "ml-view";
    const mlModeAttribute = "ml-mode";
    const mlModeProperty = "--" + mlModeAttribute;

    @DI.injectable(IPreloadManager)
    class PreloadManager implements IPreloadManager
    {
        protected readonly _html: HTMLHtmlElement;
        constructor(doc: Document,
            private readonly _module: MidnightLizard.Settings.CurrentExtensionModule,
            protected readonly _settingsManager: MidnightLizard.Settings.IBaseSettingsManager,
            protected readonly _app: MidnightLizard.Settings.IApplicationSettings)
        {
            let localStorageIsAccessable = true;
            try
            {
                localStorage.getItem("test");
            }
            catch
            {
                localStorageIsAccessable = false;
            }
            this._html = doc.documentElement as HTMLHtmlElement;
            if (localStorageIsAccessable && !this._app.isInIncognitoMode)
            {
                this.applyCachedSettings();
                _settingsManager.onSettingsInitialized.addListener(
                    this.onSettingsInitialized, this, Events.EventHandlerPriority.After);
                _settingsManager.onSettingsChanged.addListener(
                    this.onSettingsChanged, this, Events.EventHandlerPriority.After);
            }
        }

        private applyCachedSettings()
        {
            if (localStorage.getItem(mlIsActiveProperty) === "true")
            {
                this._html.setAttribute(mlViewAttribute, window.top === window.self ? "top" : "child");
                this._html.setAttribute(mlIsActiveAttribute, "");

                const cachedMode = localStorage.getItem(mlModeProperty);
                if (cachedMode)
                {
                    this._html.setAttribute(mlModeAttribute, cachedMode);
                }

                if (this._module.name === Settings.ExtensionModule.PopupWindow)
                {
                    this._html.style.setProperty(mlPpreloadFilterProperty,
                        localStorage.getItem(mlPpreloadFilterProperty) || "none");
                }
                else
                {
                    const bgLight = localStorage.getItem(mlBackgroundLightnessLimitProperty);
                    this._html.style.setProperty(mlBackgroundLightnessLimitProperty,
                        bgLight === null ? "1" : bgLight);
                }
            }
        }

        private applyActualSettings(shift: Colors.ComponentShift)
        {
            if (this._settingsManager.isActive)
            {
                this._html.setAttribute(mlIsActiveAttribute, "");
                if (this._module.name === Settings.ExtensionModule.PopupWindow)
                {
                    this._html.mlComputedStyle = this._html.mlComputedStyle ||
                        this._html.ownerDocument!.defaultView!.getComputedStyle(this._html);
                    const textFilter = this._html.mlComputedStyle.getPropertyValue("--ml-text-filter");
                    localStorage.setItem(mlPpreloadFilterProperty, textFilter);
                }
                else
                {
                    const bgLight = shift!.Background.lightnessLimit.toString();
                    localStorage.setItem(mlBackgroundLightnessLimitProperty, bgLight);
                    localStorage.setItem(mlModeProperty,
                        this._settingsManager.currentSettings.mode);
                }
            }
            else
            {
                this._html.removeAttribute(mlModeAttribute);
                this._html.removeAttribute(mlViewAttribute);
                this._html.removeAttribute(mlIsActiveAttribute);
                this._html.style.removeProperty(mlBackgroundLightnessLimitProperty);
                this._html.style.removeProperty(mlPpreloadFilterProperty);
            }
            localStorage.setItem(mlIsActiveProperty, this._settingsManager.isActive ? "true" : "false");
        }

        protected onSettingsInitialized(shift?: Colors.ComponentShift): void
        {
            this.applyActualSettings(shift!);
        }

        protected onSettingsChanged(resp: any, shift?: Colors.ComponentShift): void
        {
            this.applyActualSettings(shift!);
        }
    }
}