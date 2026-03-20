import QtQuick
import QtQuick.Layouts
import qs.Commons
import qs.Widgets

ColumnLayout {
    id: root

    property var pluginApi: null
    readonly property var mainInst: pluginApi?.mainInstance ?? null

    property bool valueEnabled: pluginApi?.pluginSettings?.enabled ?? true
    property bool valueShowBarValue: pluginApi?.pluginSettings?.showBarValue ?? true
    property int valuePrecision: pluginApi?.pluginSettings?.precision ?? 8
    property int valueMaxHistory: pluginApi?.pluginSettings?.maxHistory ?? 6
    property string valueLanguage: pluginApi?.pluginSettings?.language ?? "auto"

    property int _langVersion: 0

    Connections {
        target: mainInst
        function onTranslationVersionChanged() {
            root._langVersion++;
        }
    }

    spacing: Style.marginM

    function t(key) {
        if (_langVersion < 0) return key;
        return mainInst?.translate(key) ?? key;
    }

    function saveSettings() {
        if (!pluginApi?.pluginSettings) return;
        pluginApi.pluginSettings.enabled = valueEnabled;
        pluginApi.pluginSettings.showBarValue = valueShowBarValue;
        pluginApi.pluginSettings.precision = valuePrecision;
        pluginApi.pluginSettings.maxHistory = valueMaxHistory;
        pluginApi.pluginSettings.language = valueLanguage;
        pluginApi.saveSettings();
        mainInst?.reloadLanguage(valueLanguage);
    }

    ColumnLayout {
        Layout.fillWidth: true
        spacing: Style.marginS

        NLabel {
            label: t("settings.language")
            description: t("settings.language-desc")
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: Style.marginS

            Repeater {
                model: ["auto", "en", "pt"]

                delegate: Rectangle {
                    required property string modelData
                    readonly property string langCode: modelData
                    readonly property bool isSelected: root.valueLanguage === langCode
                    readonly property string langLabel: {
                        if (langCode === "auto") return root.t("settings.lang-auto");
                        if (langCode === "en") return root.t("settings.lang-en");
                        return root.t("settings.lang-pt");
                    }

                    Layout.fillWidth: true
                    implicitHeight: 32
                    radius: Style.iRadiusM
                    color: isSelected ? Qt.alpha(Color.mPrimary, 0.15) : Color.mSurfaceVariant
                    border.color: isSelected ? Color.mPrimary : (langMouse.containsMouse ? Color.mOutline : "transparent")
                    border.width: isSelected ? 2 : 1

                    Behavior on color { ColorAnimation { duration: Style.animationFast } }
                    Behavior on border.color { ColorAnimation { duration: Style.animationFast } }

                    NText {
                        anchors.centerIn: parent
                        text: parent.langLabel
                        font.bold: parent.isSelected
                        color: parent.isSelected ? Color.mPrimary : Color.mOnSurface
                    }

                    MouseArea {
                        id: langMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            root.valueLanguage = parent.langCode;
                            root.saveSettings();
                        }
                    }
                }
            }
        }
    }

    NToggle {
        Layout.fillWidth: true
        label: t("settings.enabled")
        description: t("settings.enabled-desc")
        checked: root.valueEnabled
        onToggled: checked => {
            root.valueEnabled = checked;
            root.saveSettings();
        }
    }

    NToggle {
        Layout.fillWidth: true
        label: t("settings.show-bar")
        description: t("settings.show-bar-desc")
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
            label: t("settings.precision") + ": " + root.valuePrecision
            description: t("settings.precision-desc")
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

    ColumnLayout {
        Layout.fillWidth: true
        spacing: Style.marginS

        NLabel {
            label: t("settings.history") + ": " + root.valueMaxHistory
            description: t("settings.history-desc")
        }

        NSlider {
            Layout.fillWidth: true
            from: 3
            to: 10
            stepSize: 1
            value: root.valueMaxHistory
            onMoved: {
                root.valueMaxHistory = Math.round(value);
                root.saveSettings();
            }
        }
    }

    Rectangle {
        Layout.fillWidth: true
        radius: Style.radiusM
        color: Qt.alpha(Color.mPrimary, 0.08)
        border.color: Qt.alpha(Color.mPrimary, 0.24)
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: Style.marginM
            spacing: Style.marginXS

            NText {
                text: t("settings.shortcuts")
                font.bold: true
                color: Color.mPrimary
            }

            NText {
                Layout.fillWidth: true
                text: t("settings.shortcuts-desc")
                wrapMode: Text.WordWrap
                color: Qt.alpha(Color.mOnSurface, 0.75)
            }
        }
    }
}
