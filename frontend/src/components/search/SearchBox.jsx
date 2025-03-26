import React, { useEffect, useRef } from "react";
import {
  Box,
  InputBase,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Popper,
  Fade,
  ClickAwayListener,
  useTheme,
  alpha,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FolderIcon from "@mui/icons-material/Folder";
import TaskIcon from "@mui/icons-material/Task";
import { useSearch } from "../../contexts/SearchContext";

const SearchBox = () => {
  const theme = useTheme();
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    handleSearch,
    clearSearch,
  } = useSearch();

  const searchRef = useRef(null);
  const [open, setOpen] = React.useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleKeyPress = (event) => {
    if (event.key === "Escape") {
      clearSearch();
      setOpen(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "project":
        return <FolderIcon />;
      case "task":
        return <TaskIcon />;
      default:
        return <SearchIcon />;
    }
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box
        ref={searchRef}
        sx={{
          position: "relative",
          maxWidth: "600px",
          width: "100%",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: "2px 4px",
            display: "flex",
            alignItems: "center",
            width: "100%",
            border: "1px solid",
            borderColor: open
              ? theme.palette.primary.main
              : theme.palette.grey[300],
            backgroundColor: (theme) => alpha(theme.palette.common.black, 0.08),
            "&:hover": {
              backgroundColor: (theme) =>
                alpha(theme.palette.common.black, 0.12),
              borderColor: theme.palette.grey[400],
            },
            transition: theme.transitions.create([
              "background-color",
              "border-color",
            ]),
          }}
        >
          <IconButton
            sx={{
              p: "10px",
              color: theme.palette.text.secondary,
            }}
            aria-label="search"
          >
            <SearchIcon />
          </IconButton>
          <InputBase
            sx={{
              ml: 1,
              flex: 1,
              "& .MuiInputBase-input": {
                color: theme.palette.text.primary,
                "&::placeholder": {
                  color: theme.palette.text.secondary,
                  opacity: 0.8,
                },
              },
            }}
            placeholder="Tìm kiếm dự án, công việc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => setOpen(true)}
          />
          {searchQuery && (
            <IconButton size="small" aria-label="clear" onClick={clearSearch}>
              <ClearIcon />
            </IconButton>
          )}
        </Paper>

        <Popper
          open={open && (isSearching || searchResults.length > 0)}
          anchorEl={searchRef.current}
          placement="bottom-start"
          transition
          style={{ width: searchRef.current?.offsetWidth }}
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={350}>
              <Paper
                elevation={3}
                sx={{
                  mt: 1,
                  maxHeight: "400px",
                  overflow: "auto",
                }}
              >
                {isSearching ? (
                  <Box sx={{ p: 2, textAlign: "center" }}>
                    <Typography>Đang tìm kiếm...</Typography>
                  </Box>
                ) : (
                  <List>
                    {searchResults.map((result) => (
                      <ListItem
                        key={result.id}
                        button
                        onClick={() => {
                          // Handle navigation here
                          setOpen(false);
                        }}
                      >
                        <ListItemIcon>{getIcon(result.type)}</ListItemIcon>
                        <ListItemText
                          primary={result.title}
                          secondary={result.type}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Fade>
          )}
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};

export default SearchBox;
