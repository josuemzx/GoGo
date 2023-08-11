(function ($) {

    function setupSlidckMedia() {
        var SECONDS = 30, BREAKPOINT = 991;
        var $testimonials = $('.testimonials').last()   , $element;

        function initSlick () {
            $element = $testimonials.slick({
                prevArrow: false,
                nextArrow: false,
                speed: 500,
                autoplay: false,
                autoplaySpeed: SECONDS * 1000,
                variableWidth: false,
                slidesToShow: 1,
                slidesToScroll: 1,
                dots: true
            });
        }

        var mq = window.matchMedia("(max-width: "+BREAKPOINT+"px)")
        mq.addListener(function (e) {
            if( e.matches ) {
                initSlick();
            } else {
                if( $element && $element.hasClass('slick-initialized') ) {
                    $element.slick('slickUnfilter').slick('unslick');
                }
            }
        });
        window.innerWidth <= BREAKPOINT ? initSlick() : $.noop();
    }

    function setupFAQ () {
        var $faq = $('.faq');
        $faq.find('.faq-item').on('click', '.faq-question', function (e) {
            $(e.delegateTarget).toggleClass('faq-item-open').find('.faq-answer').slideToggle();
        })
    }

    function setupPayers() {
        var SECONDS = 30, BREAKPOINT = 991;
        var $items = $('.payers-list').last(), $element;

        function initMarquee () {
            $element = $items.marquee({
                duration: SECONDS * 1000,
                gap: 0,
                delayBeforeStart: 0,
                direction: 'left',
                duplicated: true,
                startVisible: true,
                pauseOnHover: true
            });
        }

        var mq = window.matchMedia("(max-width: "+BREAKPOINT+"px)")
        mq.addListener(function (e) {
            if( e.matches ) {
                initMarquee();
            } else {
                if( $element ) {
                    $element.marquee('destroy');
                }
            }
        });
        setTimeout(function() {
            window.innerWidth <= BREAKPOINT ? initMarquee() : $.noop();
        }, 100); // Esperar un poco que el plugin no calcular bien el ancho apenas el dom esrtá listo?
    }

    function setupNavbar() {
        var $doc = $(document), $nav = $(".site-header");

        function toggleNavbarClass () {
            $nav.toggleClass('scrolled', $doc.scrollTop() > $nav.height());
        }
        $doc.scroll(toggleNavbarClass);
        toggleNavbarClass();
    }

    function updatePhoneNumber() {
        $(this).parents('.wa-send-country-picker').find('[name="phone_number"]').val( $(this).intlTelInput("getNumber").replace('+' + $(this).intlTelInput('getSelectedCountryData').dialCode, '') ).trigger('change');
        $(this).parents('.wa-send-country-picker').find('[name="country_iso"]').val( $(this).intlTelInput('getSelectedCountryData').iso2 );
        $(this).parents('.wa-send-country-picker').find('[name="country_code"]').val( $(this).intlTelInput('getSelectedCountryData').dialCode );
    }
    function setupPhoneInput () {
        var $pi = $('.phone-input').intlTelInput({
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.13/js/utils.js",
            initialCountry: 'us',
            preferredCountries: ['us', 'mx'],
            separateDialCode: true
        });

        $pi.on("countrychange", updatePhoneNumber);
        $pi.on('input', updatePhoneNumber);
    }

    function setupForm() {
        var $form = $('.form');

        $form.on('submit', function onFormSubmit(e) {
            e.preventDefault();
            $form.find('[type="submit"]').addClass('btn-loading').prop('disabled', true);

            var post_data =  $(this).serializeArray();
            for(var i in post_data) {
                if( ['phone', 'country_code', 'promo_code', 'url_referer'].indexOf(post_data[i].name) >= 0 ) {
                    saveLocalStorage(post_data[i].name, post_data[i].value);
                }
            }

            $.post(fp_vars.ajaxurl, $(this).serialize()).done(function (response) {
                // Only save on segment.io if there is an ID
                if( response.user_id && window.analytics ) {
                    saveLocalStorage('user_id', response.user_id);

		    const queryString = window.location.search;
		    const urlParams = new URLSearchParams(queryString);
	            const ttclid = urlParams.get('ttclid')
		    console.log(ttclid);

                    analytics.track("websitesubmit", {
                        landing: location.pathname,
                        phone: response.phone_number,
                        mobile_phone: "+" + response.country_code + response.phone_number,
                        phone_country_code: response.country_code,
                        user_id: response.user_id,
			ttclid: ttclid
                    });

                    // Redirect whether the request is not done due to adblockers
                    Promise.resolve( analytics.identify(response.user_id, {
                        phone: response.phone_number,
                        phone_country_code: response.country_code
                    }) ).then(function (e) {
                        location.href = response.redirect_to;
                    })
                } else {
                    location.href = response.redirect_to;
                }


            }).fail(function () {
                alert('Se produjo un error. Inténtalo nuevamente en unos segundos.')
                $form.removeClass('btn-loading').prop('disabled', false);
            })

        }).each(function () {
            var $this = $(this);

            $this.find('[name="first_url"]').val(getCookie('first_url'));
            $this.find('[name="first_time"]').val(getCookie('first_time'));
            $this.find('[name="first_referrer"]').val(getCookie('first_referrer'));
        }).on('ready', {
            'default': {
                phone_number: false
            },
            destination: {
                phone_number: false,
                destination: false
            }
        }, function onFormReady(e, field) {
            var form_key = $(this).data('form');
            form_key = form_key ? form_key : 'default';

            if ( field ) {
                for( key in field ) {
                    e.data[form_key][key] = field[key];
                }
            }

            if( isThereAnyInvalidField (e.data[form_key]) ) {
                $form.find('[type="submit"]').attr('disabled', 'disabled');
            } else {
                $form.find('[type="submit"]').removeAttr('disabled');
            }
        });

        function isThereAnyInvalidField (fields) {
            for(var key in fields) {
                if( ! fields[key] ) {
                    return true;
                }
            }
            return false;
        }

        $form.find('.wa-send-destination').on('change', 'select', function onDestinationChange(e) {
            var currency = fp_vars.countries_rates[this.value];

            saveLocalStorage('preferred_country', this.value);

            $(e.delegateTarget).addClass('wa-send-destination-picked').find('.wa-send-destination-text').text(this.options[this.selectedIndex].text);
            $form.trigger('ready', [{ destination: true }]);

            $form.find('.currency_ratio').text(currency.value);
            $form.find('.currency_code').text(currency.iso_4117.toUpperCase());
        });

        $form.find('[name="phone_number"]').on('change', function () {
            $form.trigger('ready', [{ phone_number: /^[0-9]+$/.test(this.value.replace(/ /g, '') + '')  }])
        })

        $form.find('.wa-send-currency-picker select').on('currency_switched', {
            rates: fp_vars.countries_rates
        }, function (e, iso_country_code) {
            $form.find('.you-send').trigger('input');
        });

        fp_vars.countries_rates.us = { value: 1, iso_4117: 'usd', iso_3166: 'us' };

        $form.find('#you_send').on('change', function (e) {
            console.log('Value changed');
        }).on('input',  {
            '$from': $form.find('.currency-from'),
            '$to': $form.find('.currency-to')
        }, function (e) {
            var convert_from = e.data.$from.val(), convert_to = e.data.$to.val();

            $form.find('#they_receive').val( Math.round(fp_vars.countries_rates[convert_to].value * this.value / fp_vars.countries_rates[convert_from].value * 100) / 100 );
        });

        // Update iso currency code text on currency selection
        $form.find('.wa-send-currency-picker').on('change',  'select',  function (e) {
            $(this).trigger('change_flag');
            $form.find('.wa-send-currency-picker').not(e.delegateTarget).find('select').trigger('currency_switched', [this.value]);
        }).find('select').on('change_flag', {
            '$from': $form.find('.currency-from'),
            '$to': $form.find('.currency-to')
        }, function (e) {
            $(this).parent().find('span').text( this.options[this.selectedIndex].text )
                .end().find('img').attr('src', fp_vars.theme_path + '/images/flags/'+this.value+'.svg');

            var convert_from = e.data.$from.val(), convert_to = e.data.$to.val();
            $form.find('.transfer-cost').text( Math.round(fp_vars.transfer_cost * fp_vars.countries_rates[convert_from].value * 100) / 100);
            $form.find('.currency-from-code').text(fp_vars.countries_rates[convert_from].iso_4117.toUpperCase());
            $form.find('.currency-to-value').text(Math.round(fp_vars.countries_rates[convert_to].value * 1 / fp_vars.countries_rates[convert_from].value * 100) / 100)
            $form.find('.currency-to-code').text( fp_vars.countries_rates[convert_to].iso_4117.toUpperCase() );
        }).trigger('change');

        // Switch currencies
        $form.find('.wa-send-currency-switcher').on('click', function () {
            var $currencies = $form.find('.wa-send-currency-picker select');
            var currenciesValues = $currencies.map(function () {
                return $(this).val();
            }).get().reverse();

            $currencies.each(function (index, ele) {
                $(this).val( currenciesValues[index] ).trigger('change_flag');
            });

            var $inputs = $form.find('.wa-send-input').find('input');
            var inputValues = $inputs.map(function () { return this.value; }).get().reverse();
            $inputs.each(function(index, ele) {
                $(this).val( inputValues[index] ).trigger('change');
            })
        })

        // Getting promo code
        var urlParams = new URLSearchParams(window.location.search);
        var promo_code = urlParams.get('promo_code');

        if( promo_code ) {
            var $ele = $form.find('.wa-send-promo-code').children();

            if( ! $form.find('.wa-send-promo-code').hasClass('always') ) {
                $ele.toggle();
            }
	     $ele.find('input').val(promo_code); // .attr('readonly', 'readonly');
            $ele.find('.wa-send-promo-apply').hide();
        } else {
            $form.find('.wa-send-promo-code').on('click', '.wa-send-promo-text',function (e) {
                $(e.delegateTarget).children().toggle();
            });
        }

        // Promo code logic
        $form.find('.wa-send-promo-code').on('input', '.promo-code', function (e) {
            var val = this.value.replace(/\./g, '').trim();
            this.value = val;

            $(e.delegateTarget).find('.wa-send-promo-apply')
                .prop('disabled', val.length === 0 )
                .parents('.wa-send-promo-code')[val.length === 0 ? 'removeClass' : 'addClass']('wa-send-promo-code-filled');
        }).on('click', '.wa-send-promo-apply', {
            clicked: false
        }, function (e) {
            if ( ! e.data.clicked ) {
                $('.costs').append('<div class="costs-line costs-line-promo-code"><span>Promo code</span><span>+20.00</span></div>')
                $(this).html(fp_vars.texts.PROMO_CODE_BUTTON_CLICKED);
            } else {
                $('.costs-line-promo-code').remove();
                $(this).html(fp_vars.texts.PROMO_CODE_BUTTON_NORMAL);
            }

            var promo_code_val = $form.find('.promo-code').val();
            var new_pathname = location.pathname + replaceQueryParam('promo_code', e.data.clicked ? false : promo_code_val, window.location.search);
            window.history.replaceState('', '', new_pathname)
            $('[name="url_current"]').val( location.protocol + '//' + location.hostname + new_pathname );

            e.data.clicked = !e.data.clicked;
        }).find('.promo-code').trigger('input');

        $('.select').on('click', '.select-list-item',  {
            fpShownOnce: false
        },function (e) {
            var action = $(e.delegateTarget).data('action');

            $(e.delegateTarget).find('.select-list-holder').fadeOut();

            if( action ) {
                return $(this).trigger('fp.' + action);
            }

            $('.modal-fp').fadeIn(function () {
                if( e.data.fpShownOnce ) {
                    return;
                }

                $('.mobile-carousel').trigger('fp.modal_loaded')
                e.data.fpShownOnce = true;
            });

            var country_code = $(this).data('countrycode');
            saveLocalStorage('preferred_country', country_code);
            $('#destination').val( country_code ).trigger('change');
        }).on('click', '.select-button', function (e) {
            $(e.delegateTarget).find('.select-list-holder').fadeToggle();
        }).find('.select-list-item').on('fp.rates', function (e) {
            var cc = $(this).data('countrycode');
            $('.box-info').slideUp().filter('.box-info-' + cc).slideDown();
            $('.hero').addClass('hero-no');
        });

        $('.payers-list-mobile').on('fp.modal_loaded', function () {
            $('.payers-list-mobile').marquee({
                duration: 30 * 1000,
                gap: 0,
                delayBeforeStart: 0,
                direction: 'left',
                duplicated: true,
                startVisible: true,
                pauseOnHover: true
            });
        });
        $('.testimonials-mobile').on('fp.modal_loaded', function () {
            $('.testimonials-mobile ').slick({
                prevArrow: false,
                nextArrow: false,
                speed: 500,
                autoplay: false,
                autoplaySpeed: 30 * 1000,
                variableWidth: false,
                slidesToShow: 1,
                slidesToScroll: 1,
                dots: true
            });
        });
    }

    $(function () {

        setupSlidckMedia();
        setupFAQ();
        setupPayers();
        setupNavbar();
        setupPhoneInput();
        setupForm();
        setupCycleWords($);
        setupLocalStorage();

        $('.jump-focus').on('click', function () {
            var $input = $( $(this).data('selector') );

            $('html,body').animate({
                scrollTop: 0
            },'slow', 'linear', function () {
                setTimeout(function () {
                    $input.trigger('focus');
                }, 500);
            });
        });

        var $modal = $('.modal').on('click', '.modal__close', function () {
            $('.modal').fadeOut();
        });
        $('.btn-open-modal').on('click', function (e) {
            e.preventDefault();
            $modal.fadeIn();
        });

        var $modalfp = $('.modal-fp');
        $modalfp.on('click', '.modal-close', function () {
            $modalfp.fadeOut();
        })
    });

})( jQuery );

function setupLocalStorage () {
    saveLocalStorage('url_current', jQuery('[name="url_current"]').val());

    let params = new URLSearchParams(location.search.replace('?', ''));
    params.get('q'); // 'node'
    params.get('page'); // '2'

    var utms = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    for(var utm in utms) {
        if( params.get(utms[utm]) != null ) {
            saveLocalStorage(utms[utm], params.get(utms[utm]));
        }
    }

}

function saveLocalStorage (key, value) {
    localStorage.setItem('fp_' + key, value == null ? '' : value);
}

function setupCycleWords ($) {
    var $words = $('.words');

    if( $words.length === 0 ) return;

    var words = (function(){
        var words = [ /* 'USA', */ 'México', 'Guatemala', 'Honduras'],
            el = document.querySelector('.words'),
            currentIndex,
            currentWord,
            prevWord,
            duration = 4000;
        var _getIndex = function(max, min){
            currentIndex = Math.floor(Math.random() * (max - min + 1)) + min;
            //Generates a random number between beginning and end of words array
            return currentIndex;
        };
        var _getWord = function(index){
            currentWord = words[index];
            return currentWord;
        };
        var _clear = function() {
            setTimeout(function(){
                el.className = 'words hero-heading-underlined';
            }, duration/4);
        };
        var _toggleWord = function(duration){
            setInterval(function(){
                //Stores value of previous word
                prevWord = currentWord;
                //Generate new current word
                currentWord = words[_getIndex(words.length-1, 0)];
                //Generate new word if prev matches current
                if(prevWord === currentWord){
                    currentWord = words[_getIndex(words.length-1, 0)];
                }
                //Swap new value
                el.innerHTML = '<span>' + currentWord + '</span>';
                //Clear class styles
                _clear();
                //Fade in word
                el.classList.add(
                    'hero-heading-underlined',
                    'js-block',
                    'js-fade-in-verb'
                );
            }, duration);
        };
        var _init = function(){
            _toggleWord(duration);
        };
        //Public API
        return {
            init : function(){
                _init();
            }
        };
    })();
    words.init();
}

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

if(getCookie('first_url') == ''){
    setCookie('first_url', window.location.href,180);
    setCookie('first_time', document.getElementById('wp_time').value,180);
}

if( localStorage.getItem('first_url') == null ) {
    saveLocalStorage('first_url', window.location);
    saveLocalStorage('first_time', document.getElementById('wp_time').value);
}

if(getCookie('first_referrer') == ''){
    setCookie('first_referrer', document.referrer,180);
}
if( localStorage.getItem('first_referrer') == null ) {
    saveLocalStorage('first_referrer', document.referrer);
}

function replaceQueryParam(param, newval, search) {
    var regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?");
    var query = search.replace(regex, "$1").replace(/&$/, '');

    return (query.length > 2 ? query + "&" : "?") + (newval ? param + "=" + newval : '');
}

(function($) {

    $(function() {

        var $editables = $('.one-page-editable'), texts = {};

        function setText () {
            texts[$(this).data('key')] = this.innerHTML.replace(/^( |<br \/>)*(.*?)( |<br \/>)*$/,"$2");
        }

        $editables.each(setText)

        $editables.on('input', setText);

        $editables.on('blur', function () {
            $.post(ce.ajax_url, {
                action: 'ce_save_texts',
                texts: texts,
                page_id: ce.page_id
            })
        });
    });

}) ( jQuery )
