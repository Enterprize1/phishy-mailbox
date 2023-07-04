'use client';
import React, {FC} from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import {useTranslation} from 'react-i18next';
import {ChevronDownIcon} from '@heroicons/react/20/solid';

export const LanguageChooser: FC = () => {
  const {t, i18n} = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const languages = ['de', 'en'];
  const currentLanguage = languages.find((language) => i18n.language.startsWith(language)) ?? 'en';
  const chooseLanguage = (language: string) => {
    handleClose();
    i18n.changeLanguage(language);
  };

  return (
    <>
      <button onClick={handleClick} className='inline-flex'>
        {t('languages.' + currentLanguage)} <ChevronDownIcon className='h-6 w-6' />
      </button>
      <Menu
        id='demo-positioned-menu'
        aria-labelledby='demo-positioned-button'
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {languages.map((language) => (
          <MenuItem key={language} onClick={() => chooseLanguage(language)} selected={language === currentLanguage}>
            {t('languages.' + language)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
