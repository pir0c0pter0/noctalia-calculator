import QtQuick
import QtQuick.Layouts
import qs.Commons
import qs.Widgets

ColumnLayout {
    id: root

    property var pluginApi: null

    property bool valueShowBarValue: pluginApi?.pluginSettings?.showBarValue ?? true
    property int valuePrecision: pluginApi?.pluginSettings?.precision ?? 8

    spacing: Style.marginM

    function saveSettings() {
        if (!pluginApi?.pluginSettings) return;
        pluginApi.pluginSettings.showBarValue = valueShowBarValue;
        pluginApi.pluginSettings.precision = valuePrecision;
        pluginApi.saveSettings();
    }

    NToggle {
        Layout.fillWidth: true
        label: pluginApi?.tr("settings.show-bar") ?? "Show value in bar"
        description: pluginApi?.tr("settings.show-bar-desc") ?? "Display the current value next to the calculator icon"
        checked: root.valueShowBarValue
        onToggled: checked => {
            root.valueShowBarValue = checked;
            root.saveSettings();
        }
    }

    ColumnLayout {
        Layout.fillWidth: true
        spacing: Style.marginS

        NLabel {
            label: (pluginApi?.tr("settings.precision") ?? "Decimal precision") + ": " + root.valuePrecision
            description: pluginApi?.tr("settings.precision-desc") ?? "Maximum decimals used when formatting results"
        }

        NSlider {
            Layout.fillWidth: true
            from: 0
            to: 10
            stepSize: 1
            value: root.valuePrecision
            onMoved: {
                root.valuePrecision = Math.round(value);
                root.saveSettings();
            }
        }
    }

    NLabel {
        Layout.fillWidth: true
        label: pluginApi?.tr("settings.about") ?? "About"
        description: (pluginApi?.tr("settings.developed-by") ?? "Developed by Pir0c0pter0")
            + "<br>v" + (pluginApi?.manifest?.version ?? "1.0.0")
    }
}
