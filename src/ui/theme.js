import Colors from 'material-ui/lib/styles/colors';
import ColorManipulator from 'material-ui/lib/utils/color-manipulator';
import Spacing from 'material-ui/lib/styles/spacing';
import zIndex from 'material-ui/lib/styles/zIndex';
import ThemeManager from 'material-ui/lib/styles/theme-manager';

let raw = {
	spacing: Spacing,
	zIndex: zIndex,
	fontFamily: 'Roboto, sans-serif',
	palette: {
		primary1Color: Colors.indigo500,
		primary2Color: Colors.indigo700,
		primary3Color: Colors.lightBlack,
		accent1Color: Colors.pinkA200,
		accent2Color: Colors.grey100,
		accent3Color: Colors.grey500,
		textColor: Colors.darkBlack,
		alternateTextColor: Colors.white,
		canvasColor: Colors.white,
		borderColor: Colors.grey300,
		disabledColor: ColorManipulator.fade(Colors.darkBlack, 0.3),
		pickerHeaderColor: Colors.indigo500,
	},
};

let mui = ThemeManager.getMuiTheme(raw);
export default mui;
