
export const errors = {
	'400': {
		'INVALID_PARAM': {
			value: {
				error: {
					message: 'Неверный параметр.',
					code: 'INVALID_PARAM',
					id: '400-000-000-000',
				},
			},
		},
	},
	'401': {
		'CREDENTIAL_REQUIRED': {
			value: {
				error: {
					message: 'Credential required.',
					code: 'CREDENTIAL_REQUIRED',
					id: '401-000-000-000',
				},
			},
		},
	},
	'403': {
		'AUTHENTICATION_FAILED': {
			value: {
				error: {
					message: 'Ошибка аутентификации.',
					code: 'AUTHENTICATION_FAILED',
					id: '403-000-000-000',
				},
			},
		},
	},
	// '418': {
	// 	'I_AM_AI': {
	// 		value: {
	// 			error: {
	// 				message: '...',
	// 				code: '...',
	// 				id: '60c46cd1-f23a-46b1-bebe-5d2b73951a84',
	// 			},
	// 		},
	// 	},
	// },
	'429': {
		'RATE_LIMIT_EXCEEDED': {
			value: {
				error: {
					message: 'Сервер перегружен! Пожалуйста, попробуйте еще раз позже.',
					code: 'RATE_LIMIT_EXCEEDED',
					id: '429-000-000-000',
				},
			},
		},
	},
	'500': {
		'INTERNAL_ERROR': {
			value: {
				error: {
					message: 'Внимание! Ошибка в системе!',
					code: 'INTERNAL_ERROR',
					id: '500-000-000-000',
				},
			},
		},
	},
};
