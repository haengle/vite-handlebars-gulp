export const preventRageClicks = (steps = '.step', swiperEl = '.swiper') => {
	const $allButtons = document.querySelectorAll('button');
	const $steps = document.querySelectorAll(steps);
	const swiper = document.querySelector(swiperEl).swiper;
	const $formContainer = document.querySelector('.hero__form-container');

	if ($allButtons && swiper && $steps) {
		let isTransitionStart = false;
		let clickHandler = (e) => {
			e.preventDefault();
			e.stopPropagation();
		};

		swiper.on('slideChange', () => {
			isTransitionStart = true;
			if ($formContainer) {
				$formContainer.style.overflow = 'hidden';
			}

			$allButtons.forEach((button) => {
				button.addEventListener('click', clickHandler);
				button.disabled = true;
			});
		});

		swiper.on('slideChangeTransitionEnd', () => {
			if ($formContainer) {
				$formContainer.style.overflow = 'initial';
			}
			if (isTransitionStart) {
				isTransitionStart = false;

				$allButtons.forEach((button) => {
					button.disabled = false;
					button.removeEventListener('click', clickHandler);
				});

				$steps.forEach((step) => {
					step.classList.remove(window.modForm.opts.stepActiveCls);
				});

				document
					.querySelector(`${steps}.swiper-slide-active`)
					.classList.add(window.modForm.opts.stepActiveCls);

				document
					.querySelector(`${steps}.step[aria-hidden="false"]`)
					.focus({ preventScroll: true });

				swiper.update();
			}
		});
	}
};